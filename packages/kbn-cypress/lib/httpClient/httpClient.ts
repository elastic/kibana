import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosRequestHeaders,
} from "axios";
import axiosRetry from "axios-retry";
import Debug from "debug";
import _ from "lodash";
import prettyMilliseconds from "pretty-ms";
import { ValidationError } from "../errors";
import { warn } from "../log";
import { getAPIBaseUrl, getDelay, isRetriableError } from "./config";
import { maybePrintErrors } from "./printErrors";

const debug = Debug("currents:api");

const MAX_RETRIES = 3;

let _client: AxiosInstance | null = null;

export function getClient() {
  if (_client) {
    return _client;
  }
  _client = axios.create({
    baseURL: getAPIBaseUrl(),
  });

  _client.interceptors.request.use((config) => {
    const headers: RawAxiosRequestHeaders = {
      ...config.headers,
      // @ts-ignore
      "x-cypress-request-attempt": config["axios-retry"]?.retryCount ?? 0,
      "x-cypress-version": _cypressVersion ?? "0.0.0",
      "x-ccy-version": _currentsVersion ?? "0.0.0",
    };
    if (_runId) {
      headers["x-cypress-run-id"] = _runId;
    }
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
    const req = {
      ...config,
      headers,
    };

    debug("network request: %o", {
      ..._.pick(req, "method", "url", "headers"),
      data: Buffer.isBuffer(req.data) ? "buffer" : req.data,
    });
    return req;
  });

  axiosRetry(_client, {
    retries: MAX_RETRIES,
    retryCondition: isRetriableError,
    retryDelay: getDelay,
    // @ts-ignore
    onRetry,
  });
  return _client;
}

let _runId: string | undefined = undefined;
export const setRunId = (runId: string) => {
  _runId = runId;
};

let _cypressVersion: string | undefined = undefined;
export const setCypressVersion = (cypressVersion: string) => {
  _cypressVersion = cypressVersion;
};

let _currentsVersion: string | undefined = undefined;
export const setCurrentsVersion = (v: string) => {
  _currentsVersion = v;
};

function onRetry(
  retryCount: number,
  err: AxiosError<{ message: string; errors?: string[] }>,
  _config: AxiosRequestConfig
) {
  warn(
    "Network request failed: '%s'. Next attempt is in %s (%d/%d).",
    err.message,
    prettyMilliseconds(getDelay(retryCount)),
    retryCount,
    MAX_RETRIES
  );
}

export const makeRequest = <T = any, D = any>(
  config: AxiosRequestConfig<D>
) => {
  return getClient()<D, AxiosResponse<T>>(config)
    .then((res) => {
      debug("network response: %o", _.omit(res, "request", "config"));
      return res;
    })
    .catch((error) => {
      maybePrintErrors(error);
      throw new ValidationError(error.message);
    });
};
