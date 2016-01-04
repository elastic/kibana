export default function Processor(processorType) {
  const self = this;

  self.id = processorType.id;
  self.title = processorType.title;
  self.default = processorType.default;
  self.template = processorType.template;
};

Processor.prototype.dummy = function(paused) {
  const self = this;
}
