import type { estypes } from '@elastic/elasticsearch';

export type EsqlResponseErrorCause = Partial<estypes.ErrorCause>;

export const formatErrorCause = (errorCause: EsqlResponseErrorCause): string => {
  const head = [errorCause.type, errorCause.reason]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(': ');
  if (head) {
    return head;
  }

  const rootCause = errorCause.root_cause?.[0];
  const fromRootCause = [rootCause?.type, rootCause?.reason]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(': ');
  return fromRootCause || 'Elasticsearch returned an error';
};

export const extractEsqlResponseErrorCause = (response: object): EsqlResponseErrorCause | undefined => {
  if (!('error' in response) || response.error == null || typeof response.error !== 'object') {
    return undefined;
  }

  return response.error as EsqlResponseErrorCause;
};

export class EsqlResponseError extends Error {
  public readonly type?: string;
  public readonly reason?: string;
  public readonly rootCause?: EsqlResponseErrorCause[];

  constructor(errorCause: EsqlResponseErrorCause) {
    super(formatErrorCause(errorCause));
    this.name = 'EsqlResponseError';
    this.type = errorCause.type;
    this.reason = errorCause.reason ?? undefined;
    this.rootCause = errorCause.root_cause;
  }
}
