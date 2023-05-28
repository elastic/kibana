import { makeRequest } from "../httpClient";
import {
  CreateInstanceCyPayload,
  CreateInstancePayload,
  CreateInstanceResponse,
  CreateInstancesResponse,
  CreateRunPayload,
  CreateRunResponse,
  SetInstanceTestsPayload,
  UpdateInstanceResultsMergedPayload,
  UpdateInstanceResultsPayload,
  UpdateInstanceResultsResponse,
} from "./types";
import { printWarnings } from "./warnings";

export const createRun = async (payload: CreateRunPayload) => {
  const response = await makeRequest<CreateRunResponse, CreateRunPayload>({
    method: "POST",
    url: "/runs",
    data: payload,
  });

  if ((response.data.warnings?.length ?? 0) > 0) {
    printWarnings(response.data.warnings);
  }

  return response.data;
};

export const createInstance = async ({
  runId,
  groupId,
  machineId,
  platform,
}: CreateInstancePayload) => {
  const response = await makeRequest<
    CreateInstanceResponse,
    CreateInstancePayload
  >({
    method: "POST",
    url: `runs/${runId}/instances`,
    data: {
      runId,
      groupId,
      machineId,
      platform,
    },
  });

  return response.data;
};

export const createBatchedInstances = async (data: CreateInstanceCyPayload) => {
  const respone = await makeRequest<
    CreateInstancesResponse,
    CreateInstanceCyPayload
  >({
    method: "POST",
    url: `runs/${data.runId}/cy/instances`,
    data,
  });

  return respone.data;
};

export const setInstanceTests = (
  instanceId: string,
  payload: SetInstanceTestsPayload
) =>
  makeRequest<{}, SetInstanceTestsPayload>({
    method: "POST",
    url: `instances/${instanceId}/tests`,
    data: payload,
  }).then((result) => result.data);

export const updateInstanceResults = (
  instanceId: string,
  payload: UpdateInstanceResultsPayload
) =>
  makeRequest<UpdateInstanceResultsResponse, UpdateInstanceResultsPayload>({
    method: "POST",
    url: `instances/${instanceId}/results`,
    data: payload,
  }).then((result) => result.data);

export const reportInstanceResultsMerged = (
  instanceId: string,
  payload: UpdateInstanceResultsMergedPayload
) =>
  makeRequest<
    UpdateInstanceResultsResponse,
    UpdateInstanceResultsMergedPayload
  >({
    method: "POST",
    url: `instances/${instanceId}/cy/results`,
    data: payload,
  }).then((result) => result.data);

export const updateInstanceStdout = (instanceId: string, stdout: string) =>
  makeRequest<any, { stdout: string }>({
    method: "PUT",
    url: `instances/${instanceId}/stdout`,
    data: {
      stdout,
    },
  });
