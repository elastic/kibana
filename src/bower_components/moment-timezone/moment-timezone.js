// moment-timezone.js
// version : 0.0.3
// author : Tim Wood
// license : MIT
// github.com/timrwood/moment-timezone

(function () {

	var VERSION = "0.0.3";

	function onload(moment) {
		var oldZoneName = moment.fn.zoneName,
			oldZoneAbbr = moment.fn.zoneAbbr,

			defaultRule,
			rules = {},
			ruleSets = {},
			zones = {},
			zoneSets = {},
			links = {},

			TIME_RULE_WALL_CLOCK = 0,
			TIME_RULE_UTC        = 1,
			TIME_RULE_STANDARD   = 2,

			DAY_RULE_DAY_OF_MONTH   = 7,
			DAY_RULE_LAST_WEEKDAY   = 8;

		// converts time in the HH:mm:ss format to absolute number of minutes
		function parseMinutes (input) {
			input = input + '';
			var output = input.split(':'),
				sign = ~input.indexOf('-') ? -1 : 1,
				hour = Math.abs(+output[0]),
				minute = parseInt(output[1], 10) || 0,
				second = parseInt(output[2], 10) || 0;

			return sign * ((hour * 60) + (minute) + (second / 60));
		}

		/************************************
			Rules
		************************************/

		function Rule (name, startYear, endYear, month, day, dayRule, time, timeRule, offset, letters) {
			this.name      = name;
			this.startYear = +startYear;
			this.endYear   = +endYear;
			this.month     = +month;
			this.day       = +day;
			this.dayRule   = +dayRule;
			this.time      = parseMinutes(time);
			this.timeRule  = +timeRule;
			this.offset    = parseMinutes(offset);
			this.letters   = letters || '';
		}

		Rule.prototype = {
			contains : function (year) {
				return (year >= this.startYear && year <= this.endYear);
			},

			start : function (year) {
				year = Math.min(Math.max(year, this.startYear), this.endYear);
				return moment.utc([year, this.month, this.date(year), 0, this.time]);
			},

			date : function (year) {
				if (this.dayRule === DAY_RULE_DAY_OF_MONTH) {
					return this.day;
				} else if (this.dayRule === DAY_RULE_LAST_WEEKDAY) {
					return this.lastWeekday(year);
				}
				return this.weekdayAfter(year);
			},

			weekdayAfter : function (year) {
				var day = this.day,
					firstDayOfWeek = moment([year, this.month, 1]).day(),
					output = this.dayRule + 1 - firstDayOfWeek;

				while (output < day) {
					output += 7;
				}

				return output;
			},

			lastWeekday : function (year) {
				var day = this.day,
					dow = day % 7,
					lastDowOfMonth = moment([year, this.month + 1, 1]).day(),
					daysInMonth = moment([year, this.month, 1]).daysInMonth(),
					output = daysInMonth + (dow - (lastDowOfMonth - 1)) - (~~(day / 7) * 7);

				if (dow >= lastDowOfMonth) {
					output -= 7;
				}
				return output;
			}
		};

		/************************************
			Rule Year
		************************************/

		function RuleYear (year, rule) {
			this.rule = rule;
			this.start = rule.start(year);
		}

		RuleYear.prototype = {
			equals : function (other) {
				if (!other || other.rule !== this.rule) {
					return false;
				}
				return Math.abs(other.start - this.start) < 86400000; // 24 * 60 * 60 * 1000
			}
		};

		function sortRuleYears (a, b) {
			if (a.isLast) {
				return -1;
			}
			if (b.isLast) {
				return 1;
			}
			return b.start - a.start;
		}

		/************************************
			Rule Sets
		************************************/

		function RuleSet (name) {
			this.name = name;
			this.rules = [];
		}

		RuleSet.prototype = {
			add : function (rule) {
				this.rules.push(rule);
			},

			ruleYears : function (mom, lastZone) {
				var i, j,
					year = mom.year(),
					rule,
					lastZoneRule,
					rules = [];

				for (i = 0; i < this.rules.length; i++) {
					rule = this.rules[i];
					if (rule.contains(year)) {
						rules.push(new RuleYear(year, rule));
					} else if (rule.contains(year + 1)) {
						rules.push(new RuleYear(year + 1, rule));
					}
				}
				rules.push(new RuleYear(year - 1, this.lastYearRule(year - 1)));

				if (lastZone) {
					lastZoneRule = new RuleYear(year - 1, lastZone.lastRule());
					lastZoneRule.start = lastZone.until.clone().utc();
					lastZoneRule.isLast = lastZone.ruleSet !== this;
					rules.push(lastZoneRule);
				}

				rules.sort(sortRuleYears);
				return rules;
			},

			rule : function (mom, offset, lastZone) {
				var rules = this.ruleYears(mom, lastZone),
					lastOffset = 0,
					rule,
					lastZoneOffset,
					lastZoneOffsetAbs,
					lastRule,
					i;

				if (lastZone) {
					lastZoneOffset = lastZone.offset + lastZone.lastRule().offset;
					lastZoneOffsetAbs = Math.abs(lastZoneOffset) * 90000;
				}

				// make sure to include the previous rule's offset
				for (i = rules.length - 1; i > -1; i--) {
					lastRule = rule;
					rule = rules[i];

					if (rule.equals(lastRule)) {
						continue;
					}

					if (lastZone && !rule.isLast && Math.abs(rule.start - lastZone.until) <= lastZoneOffsetAbs) {
						lastOffset += lastZoneOffset - offset;
					}

					if (rule.rule.timeRule === TIME_RULE_STANDARD) {
						lastOffset = offset;
					}

					if (rule.rule.timeRule !== TIME_RULE_UTC) {
						rule.start.add('m', -lastOffset);
					}

					lastOffset = rule.rule.offset + offset;
				}

				for (i = 0; i < rules.length; i++) {
					rule = rules[i];
					if (mom >= rule.start && !rule.isLast) {
						return rule.rule;
					}
				}

				return defaultRule;
			},

			lastYearRule : function (year) {
				var i,
					rule,
					start,
					bestRule = defaultRule,
					largest = -1e30;

				for (i = 0; i < this.rules.length; i++) {
					rule = this.rules[i];
					if (year >= rule.startYear) {
						start = rule.start(year);
						if (start > largest) {
							largest = start;
							bestRule = rule;
						}
					}
				}

				return bestRule;
			}
		};

		/************************************
			Zone
		************************************/

		function Zone (name, offset, ruleSet, letters, until, untilOffset) {
			var i,
				untilArray = typeof until === 'string' ? until.split('_') : [9999];

			this.name = name;
			this.offset = parseMinutes(offset);
			this.ruleSet = ruleSet;
			this.letters = letters;

			for (i = 0; i < untilArray.length; i++) {
				untilArray[i] = +untilArray[i];
			}
			this.until = moment.utc(untilArray).subtract('m', parseMinutes(untilOffset));
		}

		Zone.prototype = {
			rule : function (mom, lastZone) {
				return this.ruleSet.rule(mom, this.offset, lastZone);
			},

			lastRule : function () {
				if (!this._lastRule) {
					this._lastRule = this.rule(this.until);
				}
				return this._lastRule;
			},

			format : function (rule) {
				return this.letters.replace("%s", rule.letters);
			}
		};

		/************************************
			Zone Set
		************************************/

		function sortZones (a, b) {
			return a.until - b.until;
		}

		function ZoneSet (name) {
			this.name = normalizeName(name);
			this.displayName = name;
			this.zones = [];
		}

		ZoneSet.prototype = {
			zoneAndRule : function (mom) {
				var i,
					zone,
					lastZone;

				mom = mom.clone().utc();
				for (i = 0; i < this.zones.length; i++) {
					zone = this.zones[i];
					if (mom < zone.until) {
						break;
					}
					lastZone = zone;
				}

				return [zone, zone.rule(mom, lastZone)];
			},

			add : function (zone) {
				this.zones.push(zone);
				this.zones.sort(sortZones);
			},

			format : function (mom) {
				var zoneAndRule = this.zoneAndRule(mom);
				return zoneAndRule[0].format(zoneAndRule[1]);
			},

			offset : function (mom) {
				var zoneAndRule = this.zoneAndRule(mom);
				return -(zoneAndRule[0].offset + zoneAndRule[1].offset);
			}
		};

		/************************************
			Global Methods
		************************************/

		function addRules (rules) {
			var i, j, rule;
			for (i in rules) {
				rule = rules[i];
				for (j = 0; j < rule.length; j++) {
					addRule(i + '\t' + rule[j]);
				}
			}
		}

		function addRule (ruleString) {
			// don't duplicate rules
			if (rules[ruleString]) {
				return rules[ruleString];
			}

			var p = ruleString.split(/\s/),
				name = normalizeName(p[0]),
				rule = new Rule(name, p[1], p[2], p[3], p[4], p[5], p[6], p[7], p[8], p[9], p[10]);

			// cache the rule so we don't add it again
			rules[ruleString] = rule;

			// add to the ruleset
			getRuleSet(name).add(rule);

			return rule;
		}

		function normalizeName (name) {
			return (name || '').toLowerCase().replace(/\//g, '_');
		}

		function addZones (zones) {
			var i, j, zone;
			for (i in zones) {
				zone = zones[i];
				for (j = 0; j < zone.length; j++) {
					addZone(i + '\t' + zone[j]);
				}
			}
		}

		function addLinks (linksToAdd) {
			var i;
			for (i in linksToAdd) {
				links[normalizeName(i)] = normalizeName(linksToAdd[i]);
			}
		}

		function addZone (zoneString) {
			// don't duplicate zones
			if (zones[zoneString]) {
				return zones[zoneString];
			}

			var p = zoneString.split(/\s/),
				name = normalizeName(p[0]),
				zone = new Zone(name, p[1], getRuleSet(p[2]), p[3], p[4], p[5]);

			// cache the zone so we don't add it again
			zones[zoneString] = zone;

			// add to the zoneset
			getZoneSet(p[0]).add(zone);

			return zone;
		}

		function getRuleSet (name) {
			name = normalizeName(name);
			if (!ruleSets[name]) {
				ruleSets[name] = new RuleSet(name);
			}
			return ruleSets[name];
		}

		function getZoneSet (name) {
			var machineName = normalizeName(name);
			if (links[machineName]) {
				machineName = links[machineName];
			}
			if (!zoneSets[machineName]) {
				zoneSets[machineName] = new ZoneSet(name);
			}
			return zoneSets[machineName];
		}

		function add (data) {
			if (!data) {
				return;
			}
			if (data.zones) {
				addZones(data.zones);
			}
			if (data.rules) {
				addRules(data.rules);
			}
			if (data.links) {
				addLinks(data.links);
			}
		}

		// overwrite moment.updateOffset
		moment.updateOffset = function (mom) {
			var offset;
			if (mom._z) {
				offset = mom._z.offset(mom);
				if (Math.abs(offset) < 16) {
					offset = offset / 60;
				}
				mom.zone(offset);
			}
		};

		function getZoneSets() {
			var sets = [],
				zoneName;
			for (zoneName in zoneSets) {
				sets.push(zoneSets[zoneName]);
			}
			return sets;
		}

		moment.fn.tz = function (name) {
			if (name) {
				this._z = getZoneSet(name);
				if (this._z) {
					moment.updateOffset(this);
				}
				return this;
			}
			if (this._z) {
				return this._z.displayName;
			}
		};

		moment.fn.zoneName = function () {
			if (this._z) {
				return this._z.format(this);
			}
			return oldZoneName.call(this);
		};

		moment.fn.zoneAbbr = function () {
			if (this._z) {
				return this._z.format(this);
			}
			return oldZoneAbbr.call(this);
		};

		moment.tz = function () {
			var args = [], i, len = arguments.length - 1;
			for (i = 0; i < len; i++) {
				args[i] = arguments[i];
			}
			var m = moment.apply(null, args);
			var preTzOffset = m.zone();
			m.tz(arguments[len]);
			return m.add('minutes', m.zone() - preTzOffset);
		};

		moment.tz.add = add;
		moment.tz.addRule = addRule;
		moment.tz.addZone = addZone;
		moment.tz.zones = getZoneSets;

		moment.tz.version = VERSION;

		// add default rule
		defaultRule = addRule("- 0 9999 0 0 0 0 0 0");

		return moment;
	}

	if (typeof define === "function" && define.amd) {
		define("moment-timezone", ["moment"], onload);
	} else if (typeof window !== "undefined" && window.moment) {
		onload(window.moment);
	} else if (typeof module !== 'undefined') {
		module.exports = onload(require('moment'));
	}
}).apply(this);
