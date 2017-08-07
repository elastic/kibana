import * as express from 'express';

// TODO Needs _some_ work
export type StatusCode = 200 | 202 | 204 | 400 | 401 | 500;

export interface KibanaResponse {
  ok<T extends { [key: string]: any }>(payload: T): KibanaResponse;
  accepted<T extends { [key: string]: any }>(payload: T): KibanaResponse;
  noContent(): KibanaResponse;

  badRequest<T extends Error>(err: T): KibanaResponse;
  unauthorized<T extends Error>(err: T): KibanaResponse;

  internalServerError<T extends Error>(err: T): KibanaResponse;
}

type KibanaResponsePayload = { [key: string]: any } | Error;

export class KibanaResponseBuilder implements KibanaResponse {
  private isStatusSet = false;
  private payload?: KibanaResponsePayload;

  constructor(private readonly response: express.Response) {}

  ok<T extends { [key: string]: any }>(payload: T) {
    return this.setStatus(200).setPayload(payload);
  }

  accepted<T extends { [key: string]: any }>(payload: T) {
    return this.setStatus(202).setPayload(payload);
  }

  noContent() {
    return this.setStatus(204).setPayload(undefined);
  }

  badRequest<T extends Error>(err: T) {
    return this.setStatus(400).setPayload(err);
  }

  unauthorized<T extends Error>(err: T) {
    return this.setStatus(401).setPayload(err);
  }

  internalServerError<T extends Error>(err: T) {
    return this.setStatus(500).setPayload(err);
  }

  send() {
    if (this.payload === undefined) {
      this.response.send();
    } else if (this.payload instanceof Error) {
      // TODO Design an error format
      this.response.json({ error: this.payload.message });
    } else {
      this.response.json(this.payload);
    }
  }

  /**
   * Indicates whether request is already built and its status and payload can
   * not be modified anymore.
   */
  isFinal() {
    return this.isStatusSet;
  }

  private setStatus(status: StatusCode) {
    if (this.isStatusSet) {
      throw new Error('Response status has been set already.');
    }

    this.isStatusSet = true;
    this.response.status(status);
    return this;
  }

  private setPayload(payload?: KibanaResponsePayload) {
    this.payload = payload;
    return this;
  }
}
