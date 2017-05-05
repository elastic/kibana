export function Element(config) {

  // This must match the name of the function that is used to create the `type: render` object
  this.name = config.name;

  // Use this to set a more friendly name
  this.displayName = config.displayName || config.name;

  // An svg icon to use for representing this thing
  this.icon = config.icon;

  /* schema:
    {
      datasource: true,
      model: 'pointseries'
    }
  */
  this.schema = config.schema;

  this.destroy = config.destroy || function destroy(/*renderFnReturnValue*/) {};

  this.render = config.render || function render(domNode, data, done) {done();};
}
