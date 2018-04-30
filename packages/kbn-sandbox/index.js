const os = require('os');
const platform = os.platform();
const arch = os.arch();

exports.activate = function () {
  if (arch !== 'x64') {
    return {
      success: false,
      message: `Architecture ${arch} has no sandbox support`
    };
  }

  switch (platform) {
    case 'win32':
    case 'linux':
      return require(`./bin/sandbox_${platform}.node`).activate();
      break;
    default:
      return { success: false, message: `Platform ${platform} has no sandbox support.` };
  }
};
