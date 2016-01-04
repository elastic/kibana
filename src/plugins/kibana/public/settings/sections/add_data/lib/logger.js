const _ = require('lodash');

export default function ProcessorManager(processor, area, enabled) {
  const self = this;

  self.enabled = !!enabled;
  self.area = area;
  self.processor = processor;
};

ProcessorManager.prototype.log = function(message, extra) {
  const self = this;

  if (!self.enabled) return;

  if (extra) {
    console.log(self.processor.processorId, self.area, message, extra);
  } else {
    console.log(self.processor.processorId, self.area, message);
  }
}
