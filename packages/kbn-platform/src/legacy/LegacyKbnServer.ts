/**
 * Represents a wrapper around legacy `kbnServer` instance that exposes only
 * a subset of `kbnServer` APIs used by the new platform.
 */
export class LegacyKbnServer {
  constructor(private readonly rawKbnServer: any) {}

  /**
   * Custom HTTP Listener used by HapiJS server in the legacy platform.
   */
  get newPlatformProxyListener() {
    return this.rawKbnServer.newPlatform.proxyListener;
  }

  /**
   * Forwards log request to the legacy platform.
   * @param tags A string or array of strings used to briefly identify the event.
   * @param [data] Optional string or object to log with the event.
   * @param [timestamp] Timestamp value associated with the log record.
   */
  log(tags: string | string[], data?: string | Error, timestamp?: Date) {
    this.rawKbnServer.server.log(tags, data, timestamp);
  }
}
