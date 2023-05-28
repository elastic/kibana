import { CreateRunPayload, CreateRunResponse } from "cypress-cloud/lib/api/";

export const createRunPayload: CreateRunPayload = {
  ci: {
    params: { foo: "bar" },
    provider: null,
  },
  ciBuildId: "ci-build-id",
  projectId: "project-1",
  recordKey: "token-1",
  commit: {
    sha: "sha",
    branch: "main",
    authorName: "john",
    authorEmail: "john@currents.dev",
    message: "msg",
    remoteOrigin: "https://github.com/foo/bar.git",
  },
  specs: ["foo.js", "bar.js"],
  group: "group-1",
  platform: {
    osName: "linux",
    osVersion: "Debian - 10.5",
    browserName: "chrome",
    browserVersion: "6.4.7",
  },
  parallel: true,
  specPattern: [],
  tags: [],
  testingType: "e2e",
};

export const createRunResponse: CreateRunResponse = {
  warnings: [],
  groupId: "groupId1",
  machineId: "machineId1",
  runId: "runId1",
  runUrl: "runUrl1",
  isNewRun: true,
};
