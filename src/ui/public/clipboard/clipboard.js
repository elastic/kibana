import Notifier from 'ui/notify/notifier';
import uiModules from 'ui/modules';
// borrowed heavily from https://github.com/styfle/copee

const module = uiModules.get('kibana');

module.service('clipboard', function () {
  const clipboard = this;

  clipboard.urlToClipboard = (url, name) => {
    const notify = new Notifier({
      location: `Share ${name}`,
    });

    const anchorElement = document.createElement('a');
    anchorElement.style.color = 'transparent';
    anchorElement.style.border = 'none';
    anchorElement.href = url;

    const copyElement = document.createElement('textarea');
    copyElement.value = anchorElement.href;
    copyElement.cols = 1;
    copyElement.rows = 1;
    copyElement.style.color = 'transparent';
    copyElement.style.border = 'none';
    copyElement.style.position = 'absolute';
    copyElement.style.left = '-999999px';
    document.body.appendChild(copyElement);
    copyElement.select();

    let success = false;

    try {
      success = document.execCommand('copy');
      notify.info('URL copied to clipboard.');
    } catch (err) {
      success = false;
      notify.info('Failed to copy to clipboard.');
    }

    document.body.removeChild(copyElement);

    return success;
  };

});