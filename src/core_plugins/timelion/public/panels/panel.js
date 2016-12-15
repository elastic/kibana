module.exports = function Panel(name, config) {

  this.name = name;

  this.help = config.help || '';

  this.render = config.render;

  if (!config.render) throw new Error ('Panel must have a rendering function');


};
