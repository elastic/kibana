export function Element(config) {
  // This must match the name of the function that is used to create the `type: render` object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || name;

  // An image to use in the element type selector
  this.image = config.image;

  // A sentence or few about what this element does
  this.help = config.help;

  if (!config.expression) throw new Error('Element types must have a default expression');
  this.expression = config.expression;
  this.filter = config.filter;

  this.render = config.render || function render(domNode, data, done) {done();};
}
