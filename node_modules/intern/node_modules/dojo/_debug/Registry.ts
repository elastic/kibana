import lang = require('./lang');
import core = require('./interfaces');

module Registry {
	export interface ITest {
		(...args: any[]): boolean;
	}
}

interface IEntry<ValueT> {
	test: Registry.ITest;
	value: ValueT;
}

class Registry<ValueT> {
	private _entries: IEntry<ValueT>[] = [];
	private _defaultValue: ValueT;

	constructor(defaultValue?: ValueT) {
		this._defaultValue = defaultValue;
	}

	match(...args: any[]): ValueT {
		var entries: IEntry<ValueT>[] = this._entries.slice(0);
		var entry: IEntry<ValueT>;

		for (var i = 0; (entry = entries[i]); ++i) {
			if (entry.test.apply(null, args)) {
				return entry.value;
			}
		}

		if (this._defaultValue !== undefined) {
			return this._defaultValue;
		}

		throw new Error('No match found');
	}

	register(test: Registry.ITest, value: ValueT, first?: boolean): core.IHandle {
		var entries = this._entries;
		var entry: IEntry<ValueT> = {
			test: test,
			value: value
		};

		(<any> entries)[first ? 'unshift' : 'push'](entry);

		return {
			remove: function (): void {
				this.remove = function (): void {};
				lang.pullFromArray(entries, entry);
				test = value = entries = entry = null;
			}
		};
	}
}

export = Registry;
