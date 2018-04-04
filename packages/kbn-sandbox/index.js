const platform = require('os').platform();

switch (platform) {
  case 'win32':
  case 'linux':
    exports.activate = require('./bin/sandbox_' + platform).activate;
    break;
  default:
    exports.activate = () => {
      return { success: false, message: `Platform ${platform} has no sandbox support.` };
    };
}
