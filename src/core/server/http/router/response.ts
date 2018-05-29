// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400;

export class KibanaResponse<T> {
  constructor(readonly status: StatusCode, readonly payload?: T) {}
}

export const responseFactory = {
  accepted: <T extends { [key: string]: any }>(payload: T) =>
    new KibanaResponse(202, payload),
  badRequest: <T extends Error>(err: T) => new KibanaResponse(400, err),
  noContent: () => new KibanaResponse<void>(204),
  ok: <T extends { [key: string]: any }>(payload: T) =>
    new KibanaResponse(200, payload),
};

export type ResponseFactory = typeof responseFactory;
