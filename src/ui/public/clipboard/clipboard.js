import uiModules from 'ui/modules';

const module = uiModules.get('kibana');

// borrowed heavily from https://github.com/styfle/copee
module.service('clipboard', function ($document) {
  const clipboard = this;

  clipboard.urlToClipboard = (url) => {
    const anchorElement = $document.createElement('a');
    anchorElement.href = url;

    const copyElement = $document.createElement('textarea');
    copyElement.value = anchorElement.href;
    copyElement.cols = 1;
    copyElement.rows = 1;
    copyElement.style.color = 'transparent';
    copyElement.style.border = 'none';
    copyElement.style.position = 'absolute';
    copyElement.style.left = '-999999px';
    $document.body.appendChild(copyElement);
    copyElement.select();

    let success = false;

    try {
      success = $document.execCommand('copy');
    } catch (err) {
      success = false;
    }

    $document.body.removeChild(copyElement);

    return success;
  };

});