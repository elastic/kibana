import { CiParams, CiProvider } from "cypress-cloud/lib/ciProvider";
import { Platform, ValidatedCurrentsParameters } from "../../types";

export type CreateRunPayload = {
  ci: {
    params: CiParams;
    provider: CiProvider;
  };
  ciBuildId?: string;
  projectId: string;
  recordKey: string;
  commit: {
    [memoKey: string]: string | null;
  };
  specs: string[];
  group?: string;
  platform: Platform;
  parallel: boolean;
  specPattern: string[];
  tags?: string[];
  testingType: "e2e" | "component";
  timeout?: number;
  batchSize?: number;
  autoCancelAfterFailures: ValidatedCurrentsParameters["autoCancelAfterFailures"];
};

export type CloudWarning = {
  message: string;
  [key: string]: string | number | Date;
};

export type CreateRunResponse = {
  warnings: CloudWarning[];
  groupId: string;
  machineId: string;
  runId: string;
  runUrl: string;
  isNewRun: boolean;
};
