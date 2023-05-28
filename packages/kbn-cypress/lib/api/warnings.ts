import _ from "lodash";
import { magenta } from "../log";

import { info, spacer, warn } from "../log";
import { CloudWarning } from "./types";

export function printWarnings(warnings: CloudWarning[]) {
  warn("Notice from cloud service:");
  warnings.map((w) => {
    spacer(1);
    info(magenta.bold(w.message));
    Object.entries(_.omit(w, "message")).map(([key, value]) => {
      info("- %s: %s", key, value);
    });
    spacer(1);
  });
}
