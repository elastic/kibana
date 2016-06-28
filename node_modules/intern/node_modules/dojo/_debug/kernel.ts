export interface IVersion {
	major?: number;
	minor?: number;
	patch?: number;
	flag?: string;
	revision?: string;
}

export var version: IVersion = {
	/**
	 * Major version. If total version is "1.2.0-beta1", will be 1.
	 */
	major: 2,

	/**
	 * Minor version. If total version is "1.2.0-beta1", will be 2.
	 */
	minor: 0,

	/**
	 * Patch version. If total version is "1.2.0-beta1", will be 0.
	 */
	patch: 0,

	/**
	 * Descriptor flag. If total version is "1.2.0-beta1", will be "beta1".
	 */
	flag: 'dev',

	/**
	 * The ID of the Git commit used to build this version of Dojo.
	 * @type ?string
	 */
	revision: ('$Rev$'.match(/[0-9a-f]{7,}/) || [])[0],

	toString: function (): string {
		var v = this;
		return v.major + '.' + v.minor + '.' + v.patch +
			(v.flag ? '-' + v.flag : '') +
			(v.revision ? '+' + v.revision : '');
	}
};
