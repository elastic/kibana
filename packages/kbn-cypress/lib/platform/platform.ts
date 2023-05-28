import Debug from "debug";
import getos from "getos";
import { cpus, freemem, platform, release, totalmem } from "os";
import { promisify } from "util";
const debug = Debug("currents:platform");

const getOsVersion = async () => {
  if (platform() === "linux") {
    try {
      const linuxOs = await promisify(getos)();
      if ("dist" in linuxOs && "release" in linuxOs) {
        return [linuxOs.dist, linuxOs.release].join(" - ");
      } else {
        return release();
      }
    } catch {
      return release();
    }
  }
  return release();
};

export const getPlatformInfo = async () => {
  const osVersion = await getOsVersion();
  const result = {
    osName: platform(),
    osVersion,
    osCpus: cpus(),
    osMemory: {
      free: freemem(),
      total: totalmem(),
    },
  };
  debug("platform info: %o", result);
  return result;
};
