import { KibanaClient } from './kibana_client.js';
import { createJudge, type Judge, type JudgeBenchmark } from './judge.js';

export interface ParsedEnv {
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
  basePath?: string;
  space: string;
  agentId: string;
  connectorId?: string;
  /** MCP connector id used by Mem2Act for `_bulk_create_mcp`. */
  mcpConnectorId?: string;
  memoryExtractUrl?: string;
  judge: string;
  judgeModel?: string;
  anthropicKey?: string;
  openaiKey?: string;
  verbose: boolean;
}

const required = (key: string): string => {
  const v = process.env[key];
  if (v === undefined || v === '') {
    throw new Error(`Missing required env var ${key}. See memory-evals/README.md.`);
  }
  return v;
};

const optional = (key: string): string | undefined => {
  const v = process.env[key];
  return v === undefined || v === '' ? undefined : v;
};

const optionalWithDefault = (key: string, def: string): string => optional(key) ?? def;

export const parseEnv = (): ParsedEnv => {
  const apiKey = optional('KBN_API_KEY');
  const username = optional('KBN_USERNAME');
  const password = optional('KBN_PASSWORD');
  if (!apiKey && !(username && password)) {
    throw new Error('Set KBN_API_KEY or both KBN_USERNAME and KBN_PASSWORD.');
  }
  const env: ParsedEnv = {
    url: required('KBN_URL'),
    space: optionalWithDefault('KBN_SPACE', 'default'),
    agentId: optionalWithDefault('KBN_AGENT_ID', 'default'),
    judge: optionalWithDefault('KBN_JUDGE', 'auto'),
    verbose: optional('KBN_VERBOSE') === '1' || optional('KBN_VERBOSE') === 'true',
  };
  if (apiKey) env.apiKey = apiKey;
  if (username) env.username = username;
  if (password) env.password = password;
  const basePath = optional('KBN_BASE_PATH');
  if (basePath !== undefined) env.basePath = basePath;
  const connectorId = optional('KBN_CONNECTOR_ID');
  if (connectorId !== undefined) env.connectorId = connectorId;
  const mcpConnectorId = optional('KBN_MCP_CONNECTOR_ID');
  if (mcpConnectorId !== undefined) env.mcpConnectorId = mcpConnectorId;
  const memoryExtractUrl = optional('KBN_MEMORY_EXTRACT_URL');
  if (memoryExtractUrl !== undefined) env.memoryExtractUrl = memoryExtractUrl;
  const judgeModel = optional('KBN_JUDGE_MODEL');
  if (judgeModel !== undefined) env.judgeModel = judgeModel;
  const anthropicKey = optional('ANTHROPIC_API_KEY');
  if (anthropicKey !== undefined) env.anthropicKey = anthropicKey;
  const openaiKey = optional('OPENAI_API_KEY');
  if (openaiKey !== undefined) env.openaiKey = openaiKey;
  return env;
};

export const buildClient = (env: ParsedEnv): KibanaClient => {
  const opts: ConstructorParameters<typeof KibanaClient>[0] = {
    url: env.url,
    space: env.space,
    verbose: env.verbose,
  };
  if (env.apiKey) opts.apiKey = env.apiKey;
  if (env.username) opts.username = env.username;
  if (env.password) opts.password = env.password;
  if (env.basePath !== undefined) opts.basePath = env.basePath;
  if (env.memoryExtractUrl) opts.memoryExtractUrl = env.memoryExtractUrl;
  return new KibanaClient(opts);
};

export const buildJudge = (env: ParsedEnv, benchmark: JudgeBenchmark): Judge => {
  const input: Parameters<typeof createJudge>[0] = {
    mode: env.judge,
    benchmark,
  };
  if (env.anthropicKey) input.anthropicKey = env.anthropicKey;
  if (env.openaiKey) input.openaiKey = env.openaiKey;
  if (env.judgeModel) input.model = env.judgeModel;
  return createJudge(input);
};
