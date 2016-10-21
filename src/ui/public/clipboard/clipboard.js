import Notifier from 'ui/notify/notifier';
import uiModules from 'ui/modules';
// borrowed heavily from https://github.com/styfle/copee

let module = uiModules.get('kibana');

module.service('clipboard', function () {
  const clipboard = this;

  clipboard.urlToClipboard = (url, name) => {
    const notify = new Notifier({
      location: `Share ${name}`,
    });

    const a = document.createElement('a');
    a.style.color = 'transparent';
    a.style.border = 'none';
    document.body.appendChild(a);
    a.href = url;

    const ta = document.createElement('textarea');
    ta.value = a.href;
    ta.cols = 1;
    ta.rows = 1;
    ta.style.color = 'transparent';
    ta.style.border = 'none';
    document.body.appendChild(ta);
    ta.select();

    let success = false;

    try {
      success = document.execCommand('copy');
      notify.info('URL copied to clipboard.');
    } catch (err) {
      success = false;
      notify.info('Failed to copy to clipboard.');
    }

    document.body.removeChild(ta);
    document.body.removeChild(a);

    return success;
  };

});