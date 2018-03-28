import './reveal_image.less';

export const revealImage = () => ({
  name: 'revealImage',
  displayName: 'Image Reveal',
  help: 'Reveal a percentage of an image to make a custom gauge-style chart',
  reuseDomNode: true,
  render(domNode, config, handlers) {
    const aligner = document.createElement('div');
    const img = new Image();
    img.onload = function() {
      setSize();
      finish();
    };
    handlers.onResize(img.onload);

    aligner.className = 'revealImageAligner';
    aligner.style.backgroundImage = `url(${config.emptyImage})`;
    aligner.appendChild(img);
    img.style.clipPath = getClipPath(config.percent, config.origin);
    img.src = config.image;
    domNode.className = 'revealImage';

    function finish() {
      const firstChild = domNode.firstChild;
      if (firstChild) domNode.replaceChild(aligner, firstChild);
      else domNode.appendChild(aligner);
      handlers.done();
    }

    function getClipPath(percent, origin = 'bottom') {
      const directions = { bottom: 0, left: 1, top: 2, right: 3 };
      const values = [0, 0, 0, 0];
      values[directions[origin]] = `${100 - percent * 100}%`;
      return `inset(${values.join(' ')})`;
    }

    function setSize() {
      const imgDimensions = {
        height: img.naturalHeight,
        width: img.naturalWidth,
        ratio: img.naturalHeight / img.naturalWidth,
      };

      const domNodeDimensions = {
        height: domNode.clientHeight,
        width: domNode.clientWidth,
        ratio: domNode.clientHeight / domNode.clientWidth,
      };

      if (imgDimensions.ratio > domNodeDimensions.ratio) {
        img.style.height = `${domNodeDimensions.height}px`;
        img.style.width = 'initial';
      } else {
        img.style.width = `${domNodeDimensions.width}px`;
        img.style.height = 'initial';
      }
    }
  },
});
