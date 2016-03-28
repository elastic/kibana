(function (deps, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        var v = factory(require, exports); if (v !== undefined) module.exports = v;
    }
    else if (typeof define === 'function' && define.amd) {
        define(deps, factory);
    }
})(["require", "exports"], function (require, exports) {
    var days = [null, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    var operationOrder = ['year', 'month', 'dayOfMonth', 'hours', 'minutes', 'seconds', 'milliseconds'];
    function isLeapYear(year) {
        var date = new Date(year, 1, 29);
        return date.getDate() === 29;
    }
    var DateObject = (function () {
        function DateObject(value) {
            var _date;
            if (!arguments.length) {
                _date = new Date();
            }
            else if (value instanceof Date) {
                _date = new Date(+value);
            }
            else if (typeof value === 'number' || typeof value === 'string') {
                _date = new Date(value);
            }
            else {
                _date = new Date(value.year, value.month - 1, value.dayOfMonth || 1, value.hours || 0, value.minutes || 0, value.seconds || 0, value.milliseconds || 0);
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
                    get isLeapYear() {
                        return isLeapYear(this.year);
                    },
                    get daysInMonth() {
                        var month = this.month;
                        if (month === 2 && this.isLeapYear) {
                            return 29;
                        }
                        return days[month];
                    },
                    get year() {
                        return self._date.getUTCFullYear();
                    },
                    set year(year) {
                        self._date.setUTCFullYear(year);
                    },
                    get month() {
                        return self._date.getUTCMonth() + 1;
                    },
                    set month(month) {
                        self._date.setUTCMonth(month - 1);
                    },
                    get dayOfMonth() {
                        return self._date.getUTCDate();
                    },
                    set dayOfMonth(day) {
                        self._date.setUTCDate(day);
                    },
                    get hours() {
                        return self._date.getUTCHours();
                    },
                    set hours(hours) {
                        self._date.setUTCHours(hours);
                    },
                    get minutes() {
                        return self._date.getUTCMinutes();
                    },
                    set minutes(minutes) {
                        self._date.setUTCMinutes(minutes);
                    },
                    get seconds() {
                        return self._date.getUTCSeconds();
                    },
                    set seconds(seconds) {
                        self._date.setUTCSeconds(seconds);
                    },
                    get milliseconds() {
                        return self._date.getUTCMilliseconds();
                    },
                    set milliseconds(milliseconds) {
                        self._date.setUTCMilliseconds(milliseconds);
                    },
                    get dayOfWeek() {
                        return self._date.getUTCDay();
                    },
                    toString: function () {
                        return self._date.toUTCString();
                    }
                },
                enumerable: true
            });
        }
        DateObject.parse = function (string) {
            return new DateObject(Date.parse(string));
        };
        DateObject.now = function () {
            return new DateObject(Date.now());
        };
        Object.defineProperty(DateObject.prototype, "isLeapYear", {
            get: function () {
                return isLeapYear(this.year);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "daysInMonth", {
            get: function () {
                var month = this.month;
                if (month === 2 && this.isLeapYear) {
                    return 29;
                }
                return days[month];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "year", {
            get: function () {
                return this._date.getFullYear();
            },
            set: function (year) {
                var dayOfMonth = this.dayOfMonth;
                this._date.setFullYear(year);
                if (this.dayOfMonth < dayOfMonth) {
                    this.dayOfMonth = 0;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "month", {
            get: function () {
                return this._date.getMonth() + 1;
            },
            set: function (month) {
                var dayOfMonth = this.dayOfMonth;
                this._date.setMonth(month - 1);
                if (this.dayOfMonth < dayOfMonth) {
                    this.dayOfMonth = 0;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "dayOfMonth", {
            get: function () {
                return this._date.getDate();
            },
            set: function (day) {
                this._date.setDate(day);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "hours", {
            get: function () {
                return this._date.getHours();
            },
            set: function (hours) {
                this._date.setHours(hours);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "minutes", {
            get: function () {
                return this._date.getMinutes();
            },
            set: function (minutes) {
                this._date.setMinutes(minutes);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "seconds", {
            get: function () {
                return this._date.getSeconds();
            },
            set: function (seconds) {
                this._date.setSeconds(seconds);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "milliseconds", {
            get: function () {
                return this._date.getMilliseconds();
            },
            set: function (milliseconds) {
                this._date.setMilliseconds(milliseconds);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "time", {
            get: function () {
                return this._date.getTime();
            },
            set: function (time) {
                this._date.setTime(time);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "dayOfWeek", {
            get: function () {
                return this._date.getDay();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(DateObject.prototype, "timezoneOffset", {
            get: function () {
                return this._date.getTimezoneOffset();
            },
            enumerable: true,
            configurable: true
        });
        DateObject.prototype.add = function (value) {
            var result = new DateObject(this);
            operationOrder.forEach(function (property) {
                if (!(property in value)) {
                    return;
                }
                result[property] += value[property];
            });
            return result;
        };
        DateObject.prototype.toString = function () {
            return this._date.toString();
        };
        DateObject.prototype.toDateString = function () {
            return this._date.toDateString();
        };
        DateObject.prototype.toTimeString = function () {
            return this._date.toTimeString();
        };
        DateObject.prototype.toLocaleString = function () {
            return this._date.toLocaleString();
        };
        DateObject.prototype.toLocaleDateString = function () {
            return this._date.toLocaleDateString();
        };
        DateObject.prototype.toLocaleTimeString = function () {
            return this._date.toLocaleTimeString();
        };
        DateObject.prototype.toISOString = function () {
            return this._date.toISOString();
        };
        DateObject.prototype.toJSON = function (key) {
            return this._date.toJSON(key);
        };
        DateObject.prototype.valueOf = function () {
            return this._date.valueOf();
        };
        return DateObject;
    })();
    return DateObject;
});
//# sourceMappingURL=_debug/DateObject.js.map