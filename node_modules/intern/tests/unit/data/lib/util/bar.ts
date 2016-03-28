class Bar {
	hasRun:boolean = false;

	run() {
		throw new Error('foo');
	}
}

export = Bar
