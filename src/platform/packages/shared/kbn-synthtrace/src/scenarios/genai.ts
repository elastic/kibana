/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates GenAI (OTel semantic conventions) APM traces across multiple services
 * for testing the GenAI tab in the span/transaction details flyout.
 *
 * --- How each service appears in APM ---
 *
 * Services 1–5 generate root SERVER spans that carry gen_ai.* attributes directly,
 * so the GenAI tab appears immediately in the transaction flyout when you click
 * any trace in Services > Traces.
 *
 * Services 6–7 generate realistic OTel traces (SERVER root transaction + CLIENT
 * genAI exit spans as children). The GenAI tab appears in the SPAN flyout when you
 * expand the trace waterfall and click an individual exit span.
 *
 * Service 8 is a plain HTTP service — the GenAI tab must NOT appear anywhere.
 *
 * --- OTel GenAI semantic conventions covered ---
 *   gen_ai.operation.name: chat | embeddings | create_image
 *   gen_ai.system: openai | anthropic | aws.bedrock | vertex_ai
 *   gen_ai.request.{model, temperature, top_p, top_k, max_tokens, seed}
 *   gen_ai.response.{model, id, finish_reasons}
 *   gen_ai.usage.{input_tokens, output_tokens}
 *   gen_ai.provider.name (EDOT extension)
 *   gen_ai.input.messages / gen_ai.output.messages (EDOT extension)
 *   gen_ai.system_instructions / gen_ai.conversation.id (EDOT extension)
 *
 * --- Run ---
 *   node scripts/synthtrace genai --live --clean
 */

import { apm, ApmSynthtracePipelineSchema } from '@kbn/synthtrace-client';
import type { ApmOtelFields } from '@kbn/synthtrace-client';
import type { Scenario } from '../cli/scenario';
import { withClient } from '../lib/utils/with_client';
import { getSynthtraceEnvironment } from '../lib/utils/get_synthtrace_environment';

const ENVIRONMENT = getSynthtraceEnvironment(__filename);

// ---------------------------------------------------------------------------
// Message fixtures (EDOT-captured prompt/response content)
// ---------------------------------------------------------------------------

const CHAT_INPUT_MESSAGES = JSON.stringify([
  {
    role: 'system',
    content: 'You are an expert software engineer. Be concise and precise in your answers.',
  },
  {
    role: 'user',
    content:
      'Can you explain how the following Python code works?\n\n```python\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n```',
  },
  {
    role: 'assistant',
    content:
      'This is a **recursive Fibonacci** implementation. It returns `n` directly for base cases (0 or 1), then calls itself twice for any larger input.\n\n> Note: This has O(2ⁿ) time complexity — consider memoization for large inputs.',
  },
  {
    role: 'user',
    content: 'How would I memoize it?',
  },
]);

const CHAT_OUTPUT_MESSAGES = JSON.stringify([
  {
    role: 'assistant',
    content:
      '```python\nfrom functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    if n <= 1:\n        return n\n    return fib(n-1) + fib(n-2)\n```\n\nThis reduces complexity to **O(n)** by caching previously computed results.',
  },
]);

const TOOL_INPUT_MESSAGES = JSON.stringify([
  { role: 'user', content: 'What is the weather in Paris and Berlin?' },
]);

const TOOL_OUTPUT_MESSAGES = JSON.stringify([
  {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_abc123',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"Paris","unit":"celsius"}' },
      },
      {
        id: 'call_def456',
        type: 'function',
        function: { name: 'get_weather', arguments: '{"location":"Berlin","unit":"celsius"}' },
      },
    ],
  },
  {
    role: 'tool',
    tool_call_id: 'call_abc123',
    content: '{"temperature":18,"condition":"partly cloudy","humidity":"65%"}',
  },
  {
    role: 'tool',
    tool_call_id: 'call_def456',
    content: '{"temperature":14,"condition":"overcast","humidity":"78%"}',
  },
  {
    role: 'assistant',
    content:
      'Current weather:\n- **Paris**: 18°C, partly cloudy, 65% humidity\n- **Berlin**: 14°C, overcast, 78% humidity',
  },
]);

const AGENT_PLAN_INPUT = JSON.stringify([
  {
    role: 'user',
    content:
      'Research the top 3 open-source vector databases by GitHub stars and write a comparison table.',
  },
]);

const AGENT_PLAN_OUTPUT = JSON.stringify([
  {
    role: 'assistant',
    content:
      '## Plan\n1. Search GitHub for open-source vector databases\n2. Retrieve star counts and key stats\n3. Synthesize results into a comparison table\n\n**Tools needed:** `search_github`, `fetch_readme`',
  },
]);

const AGENT_SEARCH_INPUT = JSON.stringify([
  { role: 'user', content: 'Search GitHub for: vector database open source, sort by stars' },
]);

const AGENT_SEARCH_OUTPUT = JSON.stringify([
  {
    role: 'assistant',
    content: null,
    tool_calls: [
      {
        id: 'call_gh001',
        type: 'function',
        function: {
          name: 'search_github',
          arguments: '{"query":"vector database","sort":"stars","limit":10}',
        },
      },
    ],
  },
  {
    role: 'tool',
    tool_call_id: 'call_gh001',
    content:
      '[{"name":"milvus","stars":32000},{"name":"weaviate","stars":11000},{"name":"qdrant","stars":21000}]',
  },
  { role: 'assistant', content: 'Found results. Proceeding to synthesis.' },
]);

const AGENT_SYNTHESIS_INPUT = JSON.stringify([
  {
    role: 'user',
    content:
      'Synthesize: milvus (32k stars), weaviate (11k stars), qdrant (21k stars). Write a comparison table.',
  },
]);

const AGENT_SYNTHESIS_OUTPUT = JSON.stringify([
  {
    role: 'assistant',
    content:
      '| Database | Stars | Language | License | Highlights |\n|----------|-------|----------|---------|------------|\n| Milvus | 32k | Go/C++ | Apache 2 | Cloud-native, ANN search |\n| Qdrant | 21k | Rust | Apache 2 | Rust performance, filtering |\n| Weaviate | 11k | Go | BSD | GraphQL API, multi-modal |',
  },
]);

const RAG_EMBED_INPUT = JSON.stringify([
  {
    role: 'user',
    content: 'Encode for retrieval: "What are the side effects of ibuprofen with blood thinners?"',
  },
]);

const RAG_CHAT_INPUT = JSON.stringify([
  {
    role: 'system',
    content:
      'You are a medical information assistant. Use only the provided context. Do not give medical advice.',
  },
  {
    role: 'user',
    content:
      'What are the side effects of ibuprofen with blood thinners? Context: [Ibuprofen is an NSAID that inhibits platelet aggregation and can increase bleeding risk when combined with anticoagulants like warfarin...]',
  },
]);

const RAG_CHAT_OUTPUT = JSON.stringify([
  {
    role: 'assistant',
    content:
      'Combining ibuprofen with blood thinners (anticoagulants) can significantly **increase the risk of bleeding**, including gastrointestinal bleeding. This is because:\n\n- Ibuprofen inhibits platelet aggregation\n- Anticoagulants like warfarin reduce clotting factors\n\n> ⚠️ Always consult a healthcare provider before combining these medications.',
  },
]);

const LONG_CONTENT = JSON.stringify([
  {
    role: 'user',
    content: [
      'Please analyze the following document and extract all action items, decisions, and open questions:',
      '',
      '--- BEGIN DOCUMENT ---',
      ...Array.from(
        { length: 50 },
        (_, i) =>
          `Section ${i + 1}: This paragraph covers aspect ${
            i + 1
          } of the quarterly planning document. ` +
          `It includes budget allocations, team responsibilities, and timeline milestones. ` +
          `Key stakeholders are expected to review this section before the next all-hands meeting.`
      ),
      '--- END DOCUMENT ---',
    ].join('\n'),
  },
]);

const LONG_OUTPUT = JSON.stringify([
  {
    role: 'assistant',
    content: [
      '## Action Items',
      ...Array.from(
        { length: 10 },
        (_, i) => `- [ ] Review budget allocation for Section ${i + 1}`
      ),
      '',
      '## Decisions',
      ...Array.from({ length: 8 }, (_, i) => `- Decision ${i + 1}: Approved in planning document`),
      '',
      '## Open Questions',
      ...Array.from(
        { length: 6 },
        (_, i) => `- Q${i + 1}: Timeline for milestone ${i + 1} needs confirmation`
      ),
    ].join('\n'),
  },
]);

// ---------------------------------------------------------------------------
// Service 9: Real-world long conversation fixture
// Multi-turn developer assistant session mixing markdown, code blocks, inline
// code, bullet lists, and numbered steps across many turns.
// ---------------------------------------------------------------------------

const REALWORLD_INPUT_MESSAGES = JSON.stringify([
  {
    role: 'system',
    content:
      'You are a senior TypeScript engineer. You write clean, well-typed, production-ready code. Always explain trade-offs and mention edge cases. Format your answers with markdown.',
  },
  {
    role: 'user',
    content:
      "I'm building a Node.js REST API with Express and TypeScript. How should I structure error handling so that all errors are caught and returned as consistent JSON responses?",
  },
  {
    role: 'assistant',
    content: `## Centralised Error Handling in Express + TypeScript

The standard approach is to define a typed \`AppError\` class, throw it anywhere in your route handlers, and catch everything with a single Express error-handling middleware.

### 1. Define a typed error class

\`\`\`typescript
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    // Maintains proper prototype chain in transpiled code
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
\`\`\`

### 2. Async wrapper to avoid try/catch boilerplate

\`\`\`typescript
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const asyncHandler =
  (fn: RequestHandler) =>
  (req: Request, res: Response, next: NextFunction): Promise<void> =>
    Promise.resolve(fn(req, res, next)).catch(next);
\`\`\`

### 3. Global error middleware (must be last \`app.use\`)

\`\`\`typescript
import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    requestId?: string;
  };
}

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof AppError) {
    const body: ErrorResponse = {
      error: {
        code: err.code ?? 'APP_ERROR',
        message: err.message,
        statusCode: err.statusCode,
        requestId,
      },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // Unknown / unexpected errors — don't leak internals
  console.error('[Unhandled error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      statusCode: 500,
      requestId,
    },
  });
}
\`\`\`

### 4. Wire it up

\`\`\`typescript
import express from 'express';
import { errorMiddleware } from './middleware/error';

const app = express();
app.use(express.json());

// ... your routes here

app.use(errorMiddleware); // MUST be last
\`\`\`

> **Trade-off:** This approach doesn't distinguish between 4xx (client errors) and 5xx (server errors) in logging. You may want to log only 5xx errors to your APM backend to keep noise low.`,
  },
  {
    role: 'user',
    content:
      'Great. How do I validate request bodies? I want to reject bad payloads before they hit my route logic.',
  },
  {
    role: 'assistant',
    content: `## Request Validation with Zod

[Zod](https://zod.dev) is the de-facto standard for runtime validation in TypeScript projects because it infers types automatically — no duplicated type definitions.

### Install

\`\`\`bash
npm install zod
\`\`\`

### Define a schema

\`\`\`typescript
import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'viewer']).default('viewer'),
  age: z.number().int().positive().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
\`\`\`

### Reusable validation middleware

\`\`\`typescript
import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

export const validate =
  (schema: AnyZodObject) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors
          .map((e) => \`\${e.path.join('.')}: \${e.message}\`)
          .join('; ');
        return next(new AppError(400, message, 'VALIDATION_ERROR'));
      }
      next(err);
    }
  };
\`\`\`

### Use in a route

\`\`\`typescript
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { CreateUserSchema } from '../schemas/user';
import { asyncHandler } from '../middleware/async';
import { createUser } from '../services/user';

const router = Router();

router.post(
  '/users',
  validate(CreateUserSchema),
  asyncHandler(async (req, res) => {
    // req.body is now typed as CreateUserInput
    const user = await createUser(req.body);
    res.status(201).json({ data: user });
  })
);

export default router;
\`\`\`

> **Edge case:** \`parseAsync\` is needed if your schema contains async refinements (e.g. uniqueness checks against a DB). Use \`parse\` for sync-only schemas — it's marginally faster.`,
  },
  {
    role: 'user',
    content: 'How should I write integration tests for these routes with Jest and supertest?',
  },
  {
    role: 'assistant',
    content: `## Integration Testing with Jest + Supertest

Supertest spins up your Express app in-process — no real port needed — so tests are fast and isolated.

### Install

\`\`\`bash
npm install --save-dev jest ts-jest supertest @types/supertest @types/jest
\`\`\`

### Jest config (\`jest.config.ts\`)

\`\`\`typescript
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  coverageProvider: 'v8',
};

export default config;
\`\`\`

### Test file

\`\`\`typescript
import request from 'supertest';
import { app } from '../src/app'; // your Express app export

describe('POST /users', () => {
  it('returns 201 with valid body', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'alice@example.com', name: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ email: 'alice@example.com' });
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/users')
      .send({ name: 'Alice' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toMatch(/email/i);
  });

  it('returns 400 when role is invalid', async () => {
    const res = await request(app)
      .post('/users')
      .send({ email: 'bob@example.com', name: 'Bob', role: 'superadmin' });

    expect(res.status).toBe(400);
  });

  it('returns 500 for unexpected service errors', async () => {
    jest.spyOn(userService, 'createUser').mockRejectedValueOnce(new Error('DB down'));

    const res = await request(app)
      .post('/users')
      .send({ email: 'carol@example.com', name: 'Carol' });

    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL_SERVER_ERROR');
  });
});
\`\`\`

### Key patterns

- **One \`app\` export, no \`app.listen\`** — supertest handles the socket; calling \`listen\` in tests wastes a port.
- **\`clearMocks: true\`** — resets all \`jest.spyOn\` state between tests automatically.
- **Seed / teardown** — if you use a real test DB, run migrations in \`beforeAll\` and truncate tables in \`afterEach\` to keep tests independent.

> **Coverage tip:** Run \`jest --coverage\` and check that your \`errorMiddleware\` hits the \`unknown error\` branch — it's easy to forget to cover that path.`,
  },
  {
    role: 'user',
    content:
      'Last question: how do I containerise this app and make sure the health check works in Kubernetes?',
  },
]);

const REALWORLD_OUTPUT_MESSAGES = JSON.stringify([
  {
    role: 'assistant',
    content: `## Containerising the API and Kubernetes Health Checks

### Dockerfile (multi-stage)

\`\`\`dockerfile
# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build        # tsc → dist/

# ---- Production stage ----
FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev    # skip devDependencies
COPY --from=builder /app/dist ./dist
EXPOSE 3000
USER node                # non-root for security
CMD ["node", "dist/server.js"]
\`\`\`

> **Why multi-stage?** The final image only contains compiled JS and production deps — typically **80–90 MB** vs 600 MB+ for a single-stage dev image.

---

### Health check endpoint

\`\`\`typescript
// src/routes/health.ts
import { Router } from 'express';

const router = Router();

router.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Deeper readiness check — verify DB connectivity
router.get('/readyz', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    res.json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready', reason: 'database unreachable' });
  }
});

export default router;
\`\`\`

---

### Kubernetes Deployment manifest

\`\`\`yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-api
  template:
    metadata:
      labels:
        app: my-api
    spec:
      containers:
        - name: my-api
          image: my-registry/my-api:latest
          ports:
            - containerPort: 3000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: my-api-secrets
                  key: database-url
          livenessProbe:
            httpGet:
              path: /healthz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /readyz
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 2
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "256Mi"
\`\`\`

---

### What each probe does

| Probe | Path | Meaning when it fails |
|-------|------|-----------------------|
| **Liveness** | \`/healthz\` | Pod is stuck — Kubernetes restarts it |
| **Readiness** | \`/readyz\` | Pod isn't ready for traffic — removed from Service endpoints |

> **Common mistake:** Don't put a DB check in the *liveness* probe. If your DB goes down, Kubernetes will restart all your pods in a loop — which won't fix the DB and will cause an outage. Keep liveness lightweight (process alive) and put deep checks in readiness only.`,
  },
]);

// ---------------------------------------------------------------------------
// Scenario
// ---------------------------------------------------------------------------

const scenario: Scenario<ApmOtelFields> = async () => {
  return {
    generate: ({ range, clients: { apmEsClient } }) => {
      // =================================================================
      // Service 1: Multi-turn chat — OpenAI gpt-4o
      // ROOT SERVER span carries gen_ai.* → GenAI tab visible immediately
      // in the TRANSACTION flyout.
      // =================================================================
      const chatInstance = apm
        .otelService({
          name: 'genai-chat-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('chat-instance-1');

      const chatSpans = range
        .interval('5s')
        .rate(1)
        .generator((timestamp) =>
          chatInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 320,
              'attributes.gen_ai.usage.output_tokens': 185,
              'attributes.gen_ai.request.temperature': 0.7,
              'attributes.gen_ai.request.top_p': 1,
              'attributes.gen_ai.request.max_tokens': 2048,
              'attributes.gen_ai.request.seed': 42,
              'attributes.gen_ai.response.id': 'chatcmpl-abc123',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': CHAT_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': CHAT_OUTPUT_MESSAGES,
              'attributes.gen_ai.system_instructions':
                'You are an expert software engineer. Be concise and precise in your answers.',
              'attributes.gen_ai.conversation.id': 'conv-chat-001',
            })
            .timestamp(timestamp)
            .duration(2340)
            .success()
        );

      // =================================================================
      // Service 2: Tool / function calling — Anthropic claude-3-5-sonnet
      // Exercises the structured parts schema (tool_calls + tool results).
      // =================================================================
      const toolInstance = apm
        .otelService({
          name: 'genai-tool-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('tool-instance-1');

      const toolSpans = range
        .interval('8s')
        .rate(1)
        .generator((timestamp) =>
          toolInstance
            .span({ name: 'POST /v1/messages', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/messages',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'anthropic',
              'attributes.gen_ai.provider.name': 'anthropic',
              'attributes.gen_ai.request.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.usage.input_tokens': 95,
              'attributes.gen_ai.usage.output_tokens': 62,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.request.temperature': 0.5,
              'attributes.gen_ai.request.top_k': 40,
              'attributes.gen_ai.request.seed': 7,
              'attributes.gen_ai.response.finish_reasons': ['tool_use'],
              'attributes.gen_ai.input.messages': TOOL_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': TOOL_OUTPUT_MESSAGES,
              'attributes.gen_ai.conversation.id': 'conv-tool-001',
            })
            .timestamp(timestamp)
            .duration(1450)
            .success()
        );

      // =================================================================
      // Service 3: Text embeddings — OpenAI text-embedding-3-small
      // Exercises gen_ai.operation.name = 'embeddings' (no conversation).
      // =================================================================
      const embedInstance = apm
        .otelService({
          name: 'genai-embed-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('embed-instance-1');

      const embedSpans = range
        .interval('3s')
        .rate(1)
        .generator((timestamp) =>
          embedInstance
            .span({ name: 'POST /v1/embeddings', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/embeddings',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'embeddings',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'text-embedding-3-small',
              'attributes.gen_ai.response.model': 'text-embedding-3-small',
              'attributes.gen_ai.usage.input_tokens': 42,
              'attributes.gen_ai.usage.output_tokens': 0,
              'attributes.gen_ai.input.messages': RAG_EMBED_INPUT,
            })
            .timestamp(timestamp)
            .duration(180)
            .success()
        );

      // =================================================================
      // Service 4: Minimal fields — Amazon Bedrock titan-text-express
      // Only required gen_ai fields. Verifies optional sections stay hidden.
      // =================================================================
      const minimalInstance = apm
        .otelService({
          name: 'genai-minimal-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'java',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('minimal-instance-1');

      const minimalSpans = range
        .interval('10s')
        .rate(1)
        .generator((timestamp) =>
          minimalInstance
            .span({ name: 'POST /model/invoke', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/model/invoke',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'aws.bedrock',
              'attributes.gen_ai.request.model': 'amazon.titan-text-express-v1',
              'attributes.gen_ai.usage.input_tokens': 55,
              'attributes.gen_ai.usage.output_tokens': 38,
            })
            .timestamp(timestamp)
            .duration(890)
            .success()
        );

      // =================================================================
      // Service 5: Long content — tests the View more toggle.
      // =================================================================
      const longInstance = apm
        .otelService({
          name: 'genai-long-content-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('long-instance-1');

      const longSpans = range
        .interval('15s')
        .rate(1)
        .generator((timestamp) =>
          longInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o-mini',
              'attributes.gen_ai.response.model': 'gpt-4o-mini-2024-07-18',
              'attributes.gen_ai.usage.input_tokens': 1840,
              'attributes.gen_ai.usage.output_tokens': 512,
              'attributes.gen_ai.request.max_tokens': 4096,
              'attributes.gen_ai.request.temperature': 0.3,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': LONG_CONTENT,
              'attributes.gen_ai.output.messages': LONG_OUTPUT,
            })
            .timestamp(timestamp)
            .duration(5200)
            .success()
        );

      // =================================================================
      // Service 6: Agentic flow — SERVER transaction wrapping 3 CLIENT
      // genAI exit spans (plan → search → synthesize). The SERVER transaction
      // also carries gen_ai.* so the GenAI tab is visible in BOTH the
      // transaction flyout AND each individual span flyout.
      // =================================================================
      const agentInstance = apm
        .otelService({
          name: 'genai-agent-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('agent-instance-1');

      const agentSpans = range
        .interval('12s')
        .rate(1)
        .generator((timestamp) => {
          const tx = agentInstance
            .span({ name: 'POST /v1/agent/run', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/agent/run',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.usage.input_tokens': 1100,
              'attributes.gen_ai.usage.output_tokens': 420,
              'attributes.gen_ai.conversation.id': 'conv-agent-001',
            })
            .timestamp(timestamp)
            .duration(4500)
            .success();

          // Step 1: planning (Anthropic for diversity)
          const planSpan = agentInstance
            .genAiExitSpan({ name: 'plan claude-3-5-sonnet', system: 'anthropic' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'anthropic',
              'attributes.gen_ai.request.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.response.model': 'claude-3-5-sonnet-20241022',
              'attributes.gen_ai.usage.input_tokens': 340,
              'attributes.gen_ai.usage.output_tokens': 180,
              'attributes.gen_ai.request.temperature': 0.4,
              'attributes.gen_ai.request.max_tokens': 2048,
              'attributes.gen_ai.response.finish_reasons': ['end_turn'],
              'attributes.gen_ai.input.messages': AGENT_PLAN_INPUT,
              'attributes.gen_ai.output.messages': AGENT_PLAN_OUTPUT,
            })
            .timestamp(timestamp)
            .duration(900)
            .success();

          // Step 2: tool-assisted search
          const searchSpan = agentInstance
            .genAiExitSpan({ name: 'search gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 410,
              'attributes.gen_ai.usage.output_tokens': 155,
              'attributes.gen_ai.request.temperature': 0.0,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.response.finish_reasons': ['tool_calls'],
              'attributes.gen_ai.input.messages': AGENT_SEARCH_INPUT,
              'attributes.gen_ai.output.messages': AGENT_SEARCH_OUTPUT,
            })
            .timestamp(timestamp + 900)
            .duration(1800)
            .success();

          // Step 3: synthesis
          const synthSpan = agentInstance
            .genAiExitSpan({ name: 'synthesize gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 350,
              'attributes.gen_ai.usage.output_tokens': 85,
              'attributes.gen_ai.request.temperature': 0.6,
              'attributes.gen_ai.request.max_tokens': 512,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': AGENT_SYNTHESIS_INPUT,
              'attributes.gen_ai.output.messages': AGENT_SYNTHESIS_OUTPUT,
            })
            .timestamp(timestamp + 2700)
            .duration(500)
            .success();

          return tx.children(planSpan, searchSpan, synthSpan);
        });

      // =================================================================
      // Service 7: RAG pipeline — SERVER root + embeddings CLIENT span +
      // chat CLIENT span. Covers both operation types in one trace.
      // =================================================================
      const ragInstance = apm
        .otelService({
          name: 'genai-rag-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'python',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('rag-instance-1');

      const ragSpans = range
        .interval('7s')
        .rate(1)
        .generator((timestamp) => {
          const tx = ragInstance
            .span({ name: 'POST /v1/rag/answer', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/rag/answer',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.usage.input_tokens': 680,
              'attributes.gen_ai.usage.output_tokens': 240,
            })
            .timestamp(timestamp)
            .duration(1200)
            .success();

          const embedSpan = ragInstance
            .genAiExitSpan({ name: 'embed text-embedding-3-small', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'embeddings',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'text-embedding-3-small',
              'attributes.gen_ai.response.model': 'text-embedding-3-small',
              'attributes.gen_ai.usage.input_tokens': 42,
              'attributes.gen_ai.usage.output_tokens': 0,
              'attributes.gen_ai.input.messages': RAG_EMBED_INPUT,
            })
            .timestamp(timestamp)
            .duration(180)
            .success();

          const chatSpan = ragInstance
            .genAiExitSpan({ name: 'chat gpt-4o', system: 'openai' })
            .overrides({
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 638,
              'attributes.gen_ai.usage.output_tokens': 240,
              'attributes.gen_ai.request.temperature': 0.1,
              'attributes.gen_ai.request.max_tokens': 1024,
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.input.messages': RAG_CHAT_INPUT,
              'attributes.gen_ai.output.messages': RAG_CHAT_OUTPUT,
              'attributes.gen_ai.system_instructions':
                'You are a medical information assistant. Use only the provided context.',
            })
            .timestamp(timestamp + 180)
            .duration(1000)
            .success();

          return tx.children(embedSpan, chatSpan);
        });

      // =================================================================
      // Service 9: Real-world long conversation — multi-turn developer
      // assistant session with mixed markdown, code blocks, and prose.
      // Tests rendering fidelity: headers, numbered lists, tables,
      // inline code, fenced blocks (TypeScript / bash / dockerfile / yaml),
      // and the View more toggle on long messages.
      // =================================================================
      const realworldInstance = apm
        .otelService({
          name: 'genai-realworld-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'typescript',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('realworld-instance-1');

      const realworldSpans = range
        .interval('20s')
        .rate(1)
        .generator((timestamp) =>
          realworldInstance
            .span({ name: 'POST /v1/chat/completions', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'POST',
              'attributes.url.path': '/v1/chat/completions',
              'attributes.http.response.status_code': 200,
              'attributes.gen_ai.operation.name': 'chat',
              'attributes.gen_ai.system': 'openai',
              'attributes.gen_ai.provider.name': 'openai',
              'attributes.gen_ai.request.model': 'gpt-4o',
              'attributes.gen_ai.response.model': 'gpt-4o-2024-08-06',
              'attributes.gen_ai.usage.input_tokens': 3840,
              'attributes.gen_ai.usage.output_tokens': 1260,
              'attributes.gen_ai.request.temperature': 0.2,
              'attributes.gen_ai.request.top_p': 0.95,
              'attributes.gen_ai.request.max_tokens': 4096,
              'attributes.gen_ai.response.id': 'chatcmpl-realworld-001',
              'attributes.gen_ai.response.finish_reasons': ['stop'],
              'attributes.gen_ai.conversation.id': 'conv-realworld-001',
              'attributes.gen_ai.system_instructions':
                'You are a senior TypeScript engineer. You write clean, well-typed, production-ready code.',
              'attributes.gen_ai.input.messages': REALWORLD_INPUT_MESSAGES,
              'attributes.gen_ai.output.messages': REALWORLD_OUTPUT_MESSAGES,
            })
            .timestamp(timestamp)
            .duration(8700)
            .success()
        );

      // =================================================================
      // Service 8: Non-GenAI HTTP service — GenAI tab must NOT appear.
      // =================================================================
      const regularInstance = apm
        .otelService({
          name: 'regular-http-service',
          namespace: ENVIRONMENT,
          sdkLanguage: 'go',
          sdkName: 'opentelemetry',
          distro: 'elastic',
        })
        .instance('regular-instance-1');

      const regularSpans = range
        .interval('2s')
        .rate(1)
        .generator((timestamp) =>
          regularInstance
            .span({ name: 'GET /api/users', kind: 'Server' })
            .overrides({
              'attributes.http.request.method': 'GET',
              'attributes.url.path': '/api/users',
              'attributes.server.address': 'regular-http-service',
            })
            .timestamp(timestamp)
            .duration(45)
            .success()
        );

      return [
        withClient(
          apmEsClient,
          [
            chatSpans,
            toolSpans,
            embedSpans,
            minimalSpans,
            longSpans,
            agentSpans,
            ragSpans,
            realworldSpans,
            regularSpans,
          ].flatMap((s) => s)
        ),
      ];
    },
    setupPipeline: ({ apmEsClient }) => {
      apmEsClient.setPipeline(apmEsClient.resolvePipelineType(ApmSynthtracePipelineSchema.Otel));
    },
  };
};

export default scenario;
