// Focused check: adjacent discrete ranges coalesce into one interval.
const KBN = process.env.KIBANA_URL ?? 'http://localhost:5601/kbn';
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const AUTH = 'Basic ' + Buffer.from(process.env.AUTH ?? 'elastic:changeme').toString('base64');
const H = { authorization: AUTH, 'kbn-xsrf': 'poc', 'x-elastic-internal-origin': 'poc', 'content-type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const kbn = (m, p, b) => fetch(`${KBN}${p}`, { method: m, headers: H, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));
const es = (m, p, b) => fetch(`${ES}${p}`, { method: m, headers: { authorization: AUTH, 'content-type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => ({})) }));

const LID = 'poc-adjacency-iprange';
const INDEX = `.value-list-v2-default-${LID}`;

const run = async () => {
  await kbn('DELETE', `/api/lists?id=${LID}`);
  await sleep(300);
  const c = await kbn('POST', '/api/lists', { id: LID, name: LID, description: 'adjacency', type: 'ip_range' });
  if (c.status >= 400) throw new Error(`create failed: ${c.status} ${JSON.stringify(c.json)}`);

  // Two ADJACENT ip ranges: 10.0.0.255 + 1 == 10.0.1.0. Not overlapping, but touching.
  for (const value of ['10.0.0.0-10.0.0.255', '10.0.1.0-10.0.1.255']) {
    const r = await kbn('POST', '/api/lists/items', { list_id: LID, value });
    if (r.status >= 400) throw new Error(`add ${value} failed: ${r.status} ${JSON.stringify(r.json)}`);
  }

  // Wait for the async coalesce job to converge.
  let coalesced = [];
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    await es('POST', `/${INDEX}/_refresh`);
    const res = await es('POST', `/${INDEX}/_search`, { size: 50, query: { term: { kind: 'coalesced' } }, _source: ['range_start', 'range_end'] });
    coalesced = (res.json.hits?.hits ?? []).map((h) => `${h._source.range_start}-${h._source.range_end}`).sort();
    if (coalesced.length === 1) break;
  }

  const pass = coalesced.length === 1 && coalesced[0] === '10.0.0.0-10.0.1.255';
  console.log(`coalesced intervals: ${JSON.stringify(coalesced)}`);
  console.log(pass ? 'PASS: adjacent ranges merged into one interval' : 'FAIL: expected ["10.0.0.0-10.0.1.255"]');

  // Also confirm both source docs are retained (adjacency merge must not touch sources).
  const src = await es('POST', `/${INDEX}/_search`, { size: 0, query: { term: { kind: 'source' } }, track_total_hits: true });
  const nSrc = src.json.hits?.total?.value ?? 0;
  console.log(nSrc === 2 ? 'PASS: both source docs retained' : `FAIL: expected 2 sources, got ${nSrc}`);

  await kbn('DELETE', `/api/lists?id=${LID}`);
  process.exit(pass && nSrc === 2 ? 0 : 1);
};
run().catch((e) => { console.error(e); process.exit(1); });
