export default function Processor(processorType) {
  const self = this;

  self.id = processorType.id;
  self.title = processorType.title;
  self.default = processorType.default;
  self.template = processorType.template;
};

Processor.prototype.setParent = function(newParent) {
  const self = this;

  const oldParent = self.parent;
  self.parent = newParent;

  return (oldParent !== parent);
}
