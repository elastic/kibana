var log4js = require('../lib/log4js');

log4js.configure({
  appenders: [
    { type: "file", category: [ 'cheese', 'biscuits'], filename: "cats.log" },
    { type: "file", category: [ 'biscuits', 'wine'], filename: "wine.log" }
  ]
});

var cheese = log4js.getLogger("cheese"), biscuits = log4js.getLogger("biscuits"), wine = log4js.getLogger("wine");
cheese.info("gouda");
biscuits.info("custard cream");
wine.info("shiraz");
