import { AxiosError } from "axios";
import _ from "lodash";
import { spacer, warn } from "../log";

export function maybePrintErrors(
  err: AxiosError<{ message: string; errors?: string[] }>
) {
  if (!err.response?.data || !err.response?.status) {
    return;
  }

  const { message, errors } = err.response.data;

  switch (err.response.status) {
    case 401:
      warn("Received 401 Unauthorized");
      break;
    case 422:
      spacer(1);
      warn(...formatGenericError(message, errors));
      spacer(1);
      break;
    default:
      break;
  }
}

export function formatGenericError(
  message?: string,
  errors?: string[]
): string[] {
  if (!_.isString(message)) {
    return ["Unexpected error from the cloud service"];
  }

  if (errors?.length === 0) {
    return [message as string];
  }
  return [
    message as string,
    `
${(errors ?? []).map((e) => `  - ${e}`).join("\n")}
`,
  ];
}
