(function() {
	// random number generator from http://baagoe.org/en/wiki/Better_random_numbers_for_javascript
	var DATA;

	function hash (data) {
		var h, i, n;

		n = 0xefc8249d;

		data = data.toString();

		for (i = 0; i < data.length; i++) {
			n += data.charCodeAt(i);
			h = 0.02519603282416938 * n;
			n = h >>> 0;
			h -= n;
			h *= n;
			n = h >>> 0;
			h -= n;
			n += h * 0x100000000; // 2^32
		}

		return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
	}

	// private random helper
	function rnd () {
		var t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10; // 2^-32

		this.c = t | 0;
		this.s0 = this.s1;
		this.s1 = this.s2;
		this.s2 = t - this.c;
		return this.s2;
	}

	function Nonsense () {
		this.sow.apply(this, arguments);
	}

	Nonsense.prototype.sow = function () {
		var i, seeds, seed;

		this.s0 = hash(' ');
		this.s1 = hash(this.s0);
		this.s2 = hash(this.s1);
		this.c = 1;

		seeds = Array.prototype.slice.call(arguments);

		for (i = 0; seed = seeds[i++];) {
			this.s0 -= hash(seed);
			this.s0 += ~~(this.s0 < 0);

			this.s1 -= hash(seed);
			this.s1 += ~~(this.s1 < 0);

			this.s2 -= hash(seed);
			this.s2 += ~~(this.s2 < 0);
		}
	};


	Nonsense.prototype.uint32 = function () {
		return rnd.apply(this) * 0x100000000; // 2^32
	};

	Nonsense.prototype.fract32 = function () {
		return rnd.apply(this) + (rnd.apply(this) * 0x200000 | 0) * 1.1102230246251565e-16; // 2^-53
	};

	Nonsense.prototype.integer = function() {
		return this.uint32();
	};

	Nonsense.prototype.frac = function() {
		return this.fract32();
	};

	Nonsense.prototype.real = function() {
		return this.uint32() + this.fract32();
	};

	Nonsense.prototype.integerInRange = function(min, max) {
		return Math.floor(this.realInRange(min, max));
	};

	Nonsense.prototype.realInRange = function(min, max) {
		min = min || 0;
		max = max || 0;
		return this.frac() * (max - min) + min;
	};

	Nonsense.prototype.normal = function() {
		return 1 - 2 * this.frac();
	};

	Nonsense.prototype.uuid = function() {
		// from https://gist.github.com/1308368
		var a, b;
		for (
			b=a='';
			a++<36;
			b+=~a%5|a*3&4?(a^15?8^this.frac()*(a^20?16:4):4).toString(16):'-'
		);
		return b;
	};

	Nonsense.prototype.pick = function(ary) {
		return ary[this.integerInRange(0, ary.length)];
	};

	Nonsense.prototype.weightedPick = function(ary) {
		return ary[~~Math.pow(this.frac(), 2) * ary.length];
	};

	Nonsense.prototype.word = function() {
		return this.pick(DATA.lipsum);
	};

	Nonsense.prototype.words = function(num) {
		num = num || 3;
		var ret = [];
		for (var i = 0; i < num; i++) {
			ret.push(this.pick(DATA.lipsum));
		}
		return ret.join(' ');
	};

	Nonsense.prototype.sentence = function() {
		var ret;
		ret = this.words(this.integerInRange(2, 16)).replace(/[a-z]/, function(m) {
			return m.toUpperCase();
		});
		return ret + '.';
	};

	Nonsense.prototype.sentences = function(num) {
		num = num || 3;
		var ret = [];
		for (var i = 0; i < num; i++) {
			ret.push(this.sentence());
		}
		return ret.join(' ');
	};

	Nonsense.prototype.timestamp = function(a, b) {
		return this.realInRange(a || 946684800000, b || 1577862000000);
	};

	Nonsense.prototype.firstName = function() {
		return "" + (this.pick(DATA.names.first));
	};

	Nonsense.prototype.lastName = function() {
		return "" + (this.pick(DATA.names.last));
	};

	Nonsense.prototype.name = function() {
		return "" + (this.firstName()) + " " + (this.lastName());
	};

	Nonsense.prototype.jobTitle = function() {
		return "" + (this.pick(DATA.departments)) + " " + (this.pick(DATA.positions));
	};

	Nonsense.prototype.buzzPhrase = function() {
		return "" + (this.pick(DATA.buzz.verbs)) + " " + (this.pick(DATA.buzz.adjectives)) + " " + (this.pick(DATA.buzz.nouns));
	};

	DATA = {
		lipsum: [
			"lorem", "ipsum", "dolor", "sit", "amet", "consectetur",
			"adipiscing", "elit", "nunc", "sagittis", "tortor", "ac", "mi",
			"pretium", "sed", "convallis", "massa", "pulvinar", "curabitur",
			"non", "turpis", "velit", "vitae", "rutrum", "odio", "aliquam",
			"sapien", "orci", "tempor", "sed", "elementum", "sit", "amet",
			"tincidunt", "sed", "risus", "etiam", "nec", "lacus", "id", "ante",
			"hendrerit", "malesuada", "donec", "porttitor", "magna", "eget",
			"libero", "pharetra", "sollicitudin", "aliquam", "mattis", "mattis",
			"massa", "et", "porta", "morbi", "vitae", "magna", "augue",
			"vestibulum", "at", "lectus", "sed", "tellus", "facilisis",
			"tincidunt", "suspendisse", "eros", "magna", "consequat", "at",
			"sollicitudin", "ac", "vestibulum", "vel", "dolor", "in", "egestas",
			"lacus", "quis", "lacus", "placerat", "et", "molestie", "ipsum",
			"scelerisque", "nullam", "sit", "amet", "tortor", "dui", "aenean",
			"pulvinar", "odio", "nec", "placerat", "fringilla", "neque", "dolor"
		],
		names: {
			first: [
				"Jacob", "Isabella", "Ethan", "Emma", "Michael", "Olivia",
				"Alexander", "Sophia", "William", "Ava", "Joshua", "Emily",
				"Daniel", "Madison", "Jayden", "Abigail", "Noah", "Chloe",
				"Anthony", "Mia", "Christopher", "Elizabeth", "Aiden",
				"Addison", "Matthew", "Alexis", "David", "Ella", "Andrew",
				"Samantha", "Joseph", "Natalie", "Logan", "Grace", "James",
				"Lily", "Ryan", "Alyssa", "Benjamin", "Ashley", "Elijah",
				"Sarah", "Gabriel", "Taylor", "Christian", "Hannah", "Nathan",
				"Brianna", "Jackson", "Hailey", "John", "Kaylee", "Samuel",
				"Lillian", "Tyler", "Leah", "Dylan", "Anna", "Jonathan",
				"Allison", "Caleb", "Victoria", "Nicholas", "Avery", "Gavin",
				"Gabriella", "Mason", "Nevaeh", "Evan", "Kayla", "Landon",
				"Sofia", "Angel", "Brooklyn", "Brandon", "Riley", "Lucas",
				"Evelyn", "Isaac", "Savannah", "Isaiah", "Aubrey", "Jack",
				"Alexa", "Jose", "Peyton", "Kevin", "Makayla", "Jordan",
				"Layla", "Justin", "Lauren", "Brayden", "Zoe", "Luke", "Sydney",
				"Liam", "Audrey", "Carter", "Julia"
			],
			last: [
				"Smith", "Johnson", "Williams", "Jones", "Brown", "Davis",
				"Miller", "Wilson", "Moore", "Taylor", "Anderson", "Thomas",
				"Jackson", "White", "Harris", "Martin", "Thompson", "Garcia",
				"Martinez", "Robinson", "Clark", "Rodriguez", "Lewis", "Lee",
				"Walker", "Hall", "Allen", "Young", "Hernandez", "King",
				"Wright", "Lopez", "Hill", "Scott", "Green", "Adams", "Baker",
				"Gonzalez", "Nelson", "Carter", "Mitchell", "Perez", "Roberts",
				"Turner", "Phillips", "Campbell", "Parker", "Evans", "Edwards",
				"Collins", "Stewart", "Sanchez", "Morris", "Rogers", "Reed",
				"Cook", "Morgan", "Bell", "Murphy", "Bailey", "Rivera",
				"Cooper", "Richardson", "Cox", "Howard", "Ward", "Torres",
				"Peterson", "Gray", "Ramirez", "James", "Watson", "Brooks",
				"Kelly", "Sanders", "Price", "Bennett", "Wood", "Barnes",
				"Ross", "Henderson", "Coleman", "Jenkins", "Perry", "Powell",
				"Long", "Patterson", "Hughes", "Flores", "Washington", "Butler",
				"Simmons", "Foster", "Gonzales", "Bryant", "Alexander",
				"Russell", "Griffin", "Diaz", "Hayes"
			]
		},

		departments: ['HR', 'IT', 'Marketing', 'Engineering', 'Sales'],

		positions: ['Director', 'Manager', 'Team Lead', 'Team Member'],

		internet: {
			tlds: ['.com', '.net', '.org', '.edu', '.co.uk']
		},

		buzz: {
			nouns: [
				"action-items", "applications", "architectures", "bandwidth",
				"channels", "communities", "content", "convergence",
				"deliverables", "e-business", "e-commerce", "e-markets",
				"e-services", "e-tailers", "experiences", "eyeballs",
				"functionalities", "infomediaries", "infrastructures",
				"initiatives", "interfaces", "markets", "methodologies",
				"metrics", "mindshare", "models", "networks", "niches",
				"paradigms", "partnerships", "platforms", "portals",
				"relationships", "ROI", "schemas", "solutions", "supply-chains",
				"synergies", "systems", "technologies", "users", "vortals",
				"web services", "web-readiness"
			],
			adjectives: [
				"24/365", "24/7", "B2B", "B2C", "back-end", "best-of-breed",
				"bleeding-edge", "bricks-and-clicks", "clicks-and-mortar",
				"collaborative", "compelling", "cross-media", "cross-platform",
				"customized", "cutting-edge", "distributed", "dot-com",
				"dynamic", "e-business", "efficient", "end-to-end",
				"enterprise", "extensible", "frictionless", "front-end",
				"global", "granular", "holistic", "impactful", "innovative",
				"integrated", "interactive", "intuitive", "killer",
				"leading-edge", "magnetic", "mission-critical", "multiplatform",
				"next-generation", "one-to-one", "open-source",
				"out-of-the-box", "plug-and-play", "proactive", "real-time",
				"revolutionary", "rich", "robust", "scalable", "seamless",
				"sexy", "sticky", "strategic", "synergistic", "transparent",
				"turn-key", "ubiquitous", "user-centric", "value-added",
				"vertical", "viral", "virtual", "visionary", "web-enabled",
				"wireless", "world-class"
			],
			verbs: [
				"aggregate", "architect", "benchmark", "brand", "cultivate",
				"deliver", "deploy", "disintermediate", "drive", "e-enable",
				"embrace", "empower", "enable", "engage", "engineer", "enhance",
				"envisioneer", "evolve", "expedite", "exploit", "extend",
				"facilitate", "generate", "grow", "harness", "implement",
				"incentivize", "incubate", "innovate", "integrate", "iterate",
				"leverage", "matrix", "maximize", "mesh", "monetize", "morph",
				"optimize", "orchestrate", "productize", "recontextualize",
				"redefine", "reintermediate", "reinvent", "repurpose",
				"revolutionize", "scale", "seize", "strategize", "streamline",
				"syndicate", "synergize", "synthesize", "target", "transform",
				"transition", "unleash", "utilize", "visualize", "whiteboard"
			]
		}
	};

	if (typeof module !== 'undefined') {
		module.exports = Nonsense;
	} else if (typeof define == 'function') {
		define(function () {
			return Nonsense;
		});
	} else {
		this.Nonsense = Nonsense;
	}
}).call(this);
