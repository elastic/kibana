import { describe, expect, it, vi } from 'vitest';

import { KibanaApiError, KibanaClient } from '../kibana_client.js';

const ok = (body: unknown): Response =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

const noBody = (status: number, body: unknown): Response =>
  new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });

describe('KibanaClient', () => {
  it('issues importConversation with the right URL, method, headers and body', async () => {
    const fetchImpl = vi.fn(async () => ok({ conversation_id: 'x', round_count: 1 })) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn:5601/',
      apiKey: 'sekrit',
      basePath: '',
      space: 'default',
      fetch: fetchImpl,
    });

    const res = await client.importConversation({
      agent_id: 'default',
      id: 'abc',
      title: 't',
      mode: 'overwrite',
      rounds: [{ user_message: 'u', assistant_message: 'a' }],
    });

    expect(res.conversation_id).toBe('x');
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://kbn:5601/internal/agent_builder/conversations/_import');
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>)['authorization']).toBe('ApiKey sekrit');
    expect((init.headers as Record<string, string>)['kbn-xsrf']).toBe('report-it');
    expect((init.headers as Record<string, string>)['x-kbn-space']).toBe('default');
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json');
    const body = JSON.parse(init.body as string);
    expect(body.agent_id).toBe('default');
    expect(body.mode).toBe('overwrite');
  });

  it('uses basic auth when no api key is set', async () => {
    const fetchImpl = vi.fn(async () => ok({ deleted: 0, matched: 0, not_found: [] })) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      username: 'u',
      password: 'p',
      basePath: '',
      fetch: fetchImpl,
    });
    await client.bulkDeleteConversations({ agent_id: 'a' });
    const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]![1] as RequestInit;
    expect((init.headers as Record<string, string>)['authorization']).toMatch(/^Basic /);
  });

  it('auto-detects base path from redirect Location header', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'http://kbn:5601/') {
        // Custom base path "marketing" — Kibana redirects to /<basePath>/login or similar.
        return new Response(null, {
          status: 302,
          headers: { location: '/marketing/login?next=%2F' },
        });
      }
      return ok({ conversation_id: 'cid', round_count: 1 });
    }) as unknown as typeof fetch;
    const client = new KibanaClient({ url: 'http://kbn:5601', apiKey: 'k', fetch: fetchImpl });
    await client.importConversation({
      agent_id: 'a',
      rounds: [{ user_message: 'u', assistant_message: 'a' }],
    });
    const importCall = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes('/_import')
    );
    expect(importCall?.[0]).toBe(
      'http://kbn:5601/marketing/internal/agent_builder/conversations/_import'
    );
  });

  it('treats `/s/...` redirects as empty base path', async () => {
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === 'http://kbn:5601/') {
        return new Response(null, {
          status: 302,
          headers: { location: '/s/marketing/spaces/space_selector' },
        });
      }
      return ok({ conversation_id: 'cid', round_count: 1 });
    }) as unknown as typeof fetch;
    const client = new KibanaClient({ url: 'http://kbn:5601', apiKey: 'k', fetch: fetchImpl });
    await client.importConversation({
      agent_id: 'a',
      rounds: [{ user_message: 'u', assistant_message: 'a' }],
    });
    const importCall = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls.find((c) =>
      String(c[0]).includes('/_import')
    );
    expect(importCall?.[0]).toBe('http://kbn:5601/internal/agent_builder/conversations/_import');
  });

  it('throws KibanaApiError on 4xx and includes parsed body', async () => {
    const fetchImpl = vi.fn(async () =>
      noBody(409, { statusCode: 409, message: 'Conversation already exists' })
    ) as unknown as typeof fetch;
    const client = new KibanaClient({ url: 'http://kbn', apiKey: 'k', basePath: '', fetch: fetchImpl });
    let captured: unknown;
    try {
      await client.importConversation({
        agent_id: 'a',
        rounds: [{ user_message: 'u', assistant_message: 'a' }],
      });
    } catch (e) {
      captured = e;
    }
    expect(captured).toBeInstanceOf(KibanaApiError);
    const err = captured as KibanaApiError;
    expect(err.status).toBe(409);
    expect(err.message).toContain('Conversation already exists');
  });

  it('retries on 5xx and eventually succeeds', async () => {
    let calls = 0;
    const fetchImpl = vi.fn(async () => {
      calls += 1;
      if (calls < 3) return noBody(503, 'unavailable');
      return ok({ conversation_id: 'cid', round_count: 1 });
    }) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
      retryBaseMs: 1,
    });
    const res = await client.importConversation({
      agent_id: 'a',
      rounds: [{ user_message: 'u', assistant_message: 'a' }],
    });
    expect(res.conversation_id).toBe('cid');
    expect(calls).toBe(3);
  });

  it('does not retry on 4xx', async () => {
    const fetchImpl = vi.fn(async () => noBody(400, { message: 'bad' })) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
      retryBaseMs: 1,
    });
    await expect(
      client.importConversation({
        agent_id: 'a',
        rounds: [{ user_message: 'u', assistant_message: 'a' }],
      })
    ).rejects.toBeInstanceOf(KibanaApiError);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it('triggerMemoryExtract is a no-op when URL is unset', async () => {
    const fetchImpl = vi.fn(async () => ok({})) as unknown as typeof fetch;
    const client = new KibanaClient({ url: 'http://kbn', apiKey: 'k', basePath: '', fetch: fetchImpl });
    await client.triggerMemoryExtract({ conversation_id: 'x' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('triggerMemoryExtract POSTs to the configured URL', async () => {
    const fetchImpl = vi.fn(async () => ok({ ok: true })) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      memoryExtractUrl: 'http://memory.local/extract',
      fetch: fetchImpl,
    });
    await client.triggerMemoryExtract({
      conversation_id: 'x',
      agent_id: 'default',
      started_at: '2023-05-01T00:00:00.000Z',
    });
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://memory.local/extract');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body).toEqual({
      conversation_id: 'x',
      agent_id: 'default',
      started_at: '2023-05-01T00:00:00.000Z',
    });
  });

  it('bulkCreateMcpTools posts the request', async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ results: [{ success: true, name: 'set_value' }], summary: { requested: 1, created: 1, skipped: 0, failed: 0 } })
    ) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
    });
    const res = await client.bulkCreateMcpTools({
      connector_id: 'mcp-1',
      namespace: 'mem2act-x',
      tools: [{ name: 'set_value' }],
      tags: ['mem2act-eval'],
    });
    expect(res.summary.created).toBe(1);
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://kbn/internal/agent_builder/tools/_bulk_create_mcp');
    const body = JSON.parse((call[1] as RequestInit).body as string);
    expect(body.connector_id).toBe('mcp-1');
  });

  it('bulkDeleteTools posts the request', async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ results: [{ toolId: 'mem2act-x.set_value', success: true }] })
    ) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
    });
    const res = await client.bulkDeleteTools({ ids: ['mem2act-x.set_value'] });
    expect(res.results[0]?.success).toBe(true);
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://kbn/internal/agent_builder/tools/_bulk_delete');
  });

  it('listTools issues a GET', async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ results: [{ id: 'mem2act-x.set_value', namespace: 'mem2act-x' }] })
    ) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
    });
    const res = await client.listTools();
    expect(res).toBeTruthy();
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect((call[1] as RequestInit).method).toBe('GET');
    expect(call[0]).toBe('http://kbn/api/agent_builder/tools');
  });

  it('converse hits the public path', async () => {
    const fetchImpl = vi.fn(async () =>
      ok({ conversation_id: '', round_id: 'r', response: { message: 'hi' } })
    ) as unknown as typeof fetch;
    const client = new KibanaClient({
      url: 'http://kbn',
      apiKey: 'k',
      basePath: '',
      fetch: fetchImpl,
    });
    const out = await client.converse({ agent_id: 'a', input: 'q', persist: false });
    expect(out.response.message).toBe('hi');
    const call = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]!;
    expect(call[0]).toBe('http://kbn/api/agent_builder/converse');
  });
});
