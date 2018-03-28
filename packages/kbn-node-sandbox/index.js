const platform = require("os").platform();

switch (platform) {
  case "win32":
  case "linux":
    exports.activate = require("./build/Release/sandbox_" + platform).activate;
    break;
  default:
    exports.activate = function() {
      return { success: false, message: "Platform " + platform + " has no sandbox support." }
    }
}
