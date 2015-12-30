const _ = require('lodash');

export default function ProcessorManager(processor, area, enabled) {
  const self = this;

  self.enabled = !!enabled;
  self.area = area;
  self.processor = processor;
};

ProcessorManager.prototype.log = function(message) {
  const self = this;

  if (!self.enabled) return;

  console.log(self.processor.processorId, self.area, message);
}
