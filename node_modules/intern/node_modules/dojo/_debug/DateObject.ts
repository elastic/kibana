import core = require('./interfaces');

var days = [ null, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];
var operationOrder = [ 'year', 'month', 'dayOfMonth', 'hours', 'minutes', 'seconds', 'milliseconds' ];

function isLeapYear(year: number): boolean {
	var date = new Date(year, 1, 29);
	return date.getDate() === 29;
}

class DateObject implements core.IDateObject {
	static parse(string: string): DateObject {
		return new DateObject(Date.parse(string));
	}
	static now(): DateObject {
		return new DateObject(Date.now());
	}

	private _date: Date;
	utc: core.IDateObject;

	constructor(value: number);
	constructor(value: string);
	constructor(value: Date);
	constructor(value: core.IDateObjectArguments);
	constructor();
	constructor(value?: any) {
		var _date: Date;
		if (!arguments.length) {
			_date = new Date();
		}
		else if (value instanceof Date) {
			_date = new Date(+value);
		}
		else if (typeof value === 'number' || typeof value === 'string') {
			_date = new Date(<any> value);
		}
		else {
			_date = new Date(
				value.year,
				value.month - 1,
				value.dayOfMonth || 1,
				value.hours || 0,
				value.minutes || 0,
				value.seconds || 0,
				value.milliseconds || 0
			);
		}

		Object.defineProperty(this, '_date', {
			configurable: true,
			enumerable: false,
			value: _date,
			writable: true
		});

		var self = this;
		Object.defineProperty(this, 'utc', {
			value: {
				get isLeapYear(): boolean {
					return isLeapYear(this.year);
				},
				get daysInMonth(): number {
					var month = this.month;

					if (month === 2 && this.isLeapYear) {
						return 29;
					}
					return days[month];
				},

				get year(): number {
					return self._date.getUTCFullYear();
				},
				set year(year: number) {
					self._date.setUTCFullYear(year);
				},

				get month(): number {
					return self._date.getUTCMonth() + 1;
				},
				set month(month: number) {
					self._date.setUTCMonth(month - 1);
				},

				get dayOfMonth(): number {
					return self._date.getUTCDate();
				},
				set dayOfMonth(day: number) {
					self._date.setUTCDate(day);
				},

				get hours(): number {
					return self._date.getUTCHours();
				},
				set hours(hours: number) {
					self._date.setUTCHours(hours);
				},

				get minutes(): number {
					return self._date.getUTCMinutes();
				},
				set minutes(minutes: number) {
					self._date.setUTCMinutes(minutes);
				},

				get seconds(): number {
					return self._date.getUTCSeconds();
				},
				set seconds(seconds: number) {
					self._date.setUTCSeconds(seconds);
				},

				get milliseconds(): number {
					return self._date.getUTCMilliseconds();
				},
				set milliseconds(milliseconds: number) {
					self._date.setUTCMilliseconds(milliseconds);
				},

				get dayOfWeek(): number {
					return self._date.getUTCDay();
				},

				toString: function (): string {
					return self._date.toUTCString();
				}
			},
			enumerable: true
		});
	}

	get isLeapYear(): boolean {
		return isLeapYear(this.year);
	}

	get daysInMonth(): number {
		var month = this.month;

		if (month === 2 && this.isLeapYear) {
			return 29;
		}
		return days[month];
	}

	get year(): number {
		return this._date.getFullYear();
	}
	set year(year: number) {
		var dayOfMonth = this.dayOfMonth;

		this._date.setFullYear(year);

		if (this.dayOfMonth < dayOfMonth) {
			this.dayOfMonth = 0;
		}
	}

	get month(): number {
		return this._date.getMonth() + 1;
	}
	set month(month: number) {
		var dayOfMonth = this.dayOfMonth;

		this._date.setMonth(month - 1);

		if (this.dayOfMonth < dayOfMonth) {
			this.dayOfMonth = 0;
		}
	}

	get dayOfMonth(): number {
		return this._date.getDate();
	}
	set dayOfMonth(day: number) {
		this._date.setDate(day);
	}

	get hours(): number {
		return this._date.getHours();
	}
	set hours(hours: number) {
		this._date.setHours(hours);
	}

	get minutes(): number {
		return this._date.getMinutes();
	}
	set minutes(minutes: number) {
		this._date.setMinutes(minutes);
	}

	get seconds(): number {
		return this._date.getSeconds();
	}
	set seconds(seconds: number) {
		this._date.setSeconds(seconds);
	}

	get milliseconds(): number {
		return this._date.getMilliseconds();
	}
	set milliseconds(milliseconds: number) {
		this._date.setMilliseconds(milliseconds);
	}

	get time(): number {
		return this._date.getTime();
	}
	set time(time: number) {
		this._date.setTime(time);
	}

	get dayOfWeek(): number {
		return this._date.getDay();
	}
	get timezoneOffset(): number {
		return this._date.getTimezoneOffset();
	}

	add(value: core.IDateObjectOperationArguments): DateObject {
		var result = new DateObject(this);

		// perform from year -> milliseconds in case the year
		// and month operations cause an overshoot
		operationOrder.forEach((property: string): void => {
			if (!(property in value)) {
				return;
			}

			(<any> result)[property] += (<any> value)[property];
		});
		return result;
	}

	toString(): string {
		return this._date.toString();
	}
	toDateString(): string {
		return this._date.toDateString();
	}
	toTimeString(): string {
		return this._date.toTimeString();
	}
	toLocaleString(): string {
		return this._date.toLocaleString();
	}
	toLocaleDateString(): string {
		return this._date.toLocaleDateString();
	}
	toLocaleTimeString(): string {
		return this._date.toLocaleTimeString();
	}
	toISOString(): string {
		return this._date.toISOString();
	}
	toJSON(key?: any): string {
		return this._date.toJSON(key);
	}
	valueOf(): number {
		return this._date.valueOf();
	}
}

export = DateObject;
