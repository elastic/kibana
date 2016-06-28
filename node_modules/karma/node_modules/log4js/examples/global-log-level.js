var log4js = require('../lib/log4js');
log4js.configure({
	replaceConsole: true,
	levels: {
		"[all]": "INFO"
	},
	appenders: [
		{ type: "console", layout: { type: "basic" } }
	]
});

console.debug("I should not see this.");
console.info("I should see this.");
console.error("I should also see this.");

