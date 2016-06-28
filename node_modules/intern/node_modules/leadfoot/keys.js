/**
 * @module leadfoot/keys
 */

// http://code.google.com/p/selenium/wiki/JsonWireProtocol#/session/:sessionId/element/:id/value
// https://dvcs.w3.org/hg/webdriver/raw-file/default/webdriver-spec.html#character-types

/**
 * A list of special keys that can be used with the `pressKeys` and `type` functions.
 *
 * @see {@link module:leadfoot/Session#pressKeys} for usage details.
 * @enum {string}
 */
module.exports = {
	/** Releases all held modifier keys. */
	'NULL': '\uE000',
	/** OS-specific keystroke sequence that performs a cancel action. */
	'CANCEL': '\uE001',
	/** The help key. This key only appears on older Apple keyboards in place of the Insert key. */
	'HELP': '\uE002',
	/** The backspace key. */
	'BACKSPACE': '\uE003',
	/** The tab key. */
	'TAB': '\uE004',
	/** The clear key. This key only appears on full-size Apple keyboards in place of Num Lock key. */
	'CLEAR': '\uE005',
	/** The return key. */
	'RETURN': '\uE006',
	/** The enter (numpad) key. */
	'ENTER': '\uE007',
	/** The shift key. */
	'SHIFT': '\uE008',
	/** The control key. */
	'CONTROL': '\uE009',
	/** The alt key. */
	'ALT': '\uE00A',
	/** The pause key. */
	'PAUSE': '\uE00B',
	/** The escape key. */
	'ESCAPE': '\uE00C',

	/** The space bar. */
	'SPACE': '\uE00D',
	/** The page up key. */
	'PAGE_UP': '\uE00E',
	/** The page down key. */
	'PAGE_DOWN': '\uE00F',
	/** The end key. */
	'END': '\uE010',
	/** The home key. */
	'HOME': '\uE011',
	/** The left arrow. */
	'ARROW_LEFT': '\uE012',
	/** The up arrow. */
	'ARROW_UP': '\uE013',
	/** The right arrow. */
	'ARROW_RIGHT': '\uE014',
	/** The down arrow. */
	'ARROW_DOWN': '\uE015',
	/** The insert key. */
	'INSERT': '\uE016',
	/** The delete key. */
	'DELETE': '\uE017',
	/** The semicolon key. */
	'SEMICOLON': '\uE018',
	/** The equals key. */
	'EQUALS': '\uE019',

	/** The numpad zero key. */
	'NUMPAD0': '\uE01A',
	/** The numpad one key. */
	'NUMPAD1': '\uE01B',
	/** The numpad two key. */
	'NUMPAD2': '\uE01C',
	/** The numpad three key. */
	'NUMPAD3': '\uE01D',
	/** The numpad four key. */
	'NUMPAD4': '\uE01E',
	/** The numpad five key. */
	'NUMPAD5': '\uE01F',
	/** The numpad six key. */
	'NUMPAD6': '\uE020',
	/** The numpad seven key. */
	'NUMPAD7': '\uE021',
	/** The numpad eight key. */
	'NUMPAD8': '\uE022',
	/** The numpad nine key. */
	'NUMPAD9': '\uE023',

	/** The numpad multiply (*) key. */
	'MULTIPLY': '\uE024',
	/** The numpad add (+) key. */
	'ADD': '\uE025',
	/** The numpad separator (=) key. */
	'SEPARATOR': '\uE026',
	/** The numpad subtract (-) key. */
	'SUBTRACT': '\uE027',
	/** The numpad decimal (.) key. */
	'DECIMAL': '\uE028',
	/** The numpad divide (/) key. */
	'DIVIDE': '\uE029',

	/** The F1 key. */
	'F1': '\uE031',
	/** The F2 key. */
	'F2': '\uE032',
	/** The F3 key. */
	'F3': '\uE033',
	/** The F4 key. */
	'F4': '\uE034',
	/** The F5 key. */
	'F5': '\uE035',
	/** The F6 key. */
	'F6': '\uE036',
	/** The F7 key. */
	'F7': '\uE037',
	/** The F8 key. */
	'F8': '\uE038',
	/** The F9 key. */
	'F9': '\uE039',
	/** The F10 key. */
	'F10': '\uE03A',
	/** The F11 key. */
	'F11': '\uE03B',
	/** The F12 key. */
	'F12': '\uE03C',
	/** The meta (Windows) key. */
	'META': '\uE03D',
	/** The command (⌘) key. */
	'COMMAND': '\uE03D',
	/** The zenkaku/hankaku key. */
	'ZENKAKU_HANKAKU': '\uE040',

	'\uE000': 'NULL',
	'\uE001': 'Cancel',
	'\uE002': 'Help',
	'\uE003': 'Backspace',
	'\uE004': 'Tab',
	'\uE005': 'Clear',
	'\uE006': 'Return',
	'\uE007': 'Enter',
	'\uE008': 'Shift',
	'\uE009': 'Control',
	'\uE00A': 'Alt',
	'\uE00B': 'Pause',
	'\uE00C': 'Escape',

	'\uE00D': 'Space',
	'\uE00E': 'Page up',
	'\uE00F': 'Page down',
	'\uE010': 'End',
	'\uE011': 'Home',
	'\uE012': 'Left arrow',
	'\uE013': 'Up arrow',
	'\uE014': 'Right arrow',
	'\uE015': 'Down arrow',
	'\uE016': 'Insert',
	'\uE017': 'Delete',
	'\uE018': 'Semicolon',
	'\uE019': 'Equals',

	'\uE01A': 'Numpad 0',
	'\uE01B': 'Numpad 1',
	'\uE01C': 'Numpad 2',
	'\uE01D': 'Numpad 3',
	'\uE01E': 'Numpad 4',
	'\uE01F': 'Numpad 5',
	'\uE020': 'Numpad 6',
	'\uE021': 'Numpad 7',
	'\uE022': 'Numpad 8',
	'\uE023': 'Numpad 9',

	'\uE024': 'Multiply',
	'\uE025': 'Add',
	'\uE026': 'Separator',
	'\uE027': 'Subtract',
	'\uE028': 'Decimal',
	'\uE029': 'Divide',

	'\uE031': 'F1',
	'\uE032': 'F2',
	'\uE033': 'F3',
	'\uE034': 'F4',
	'\uE035': 'F5',
	'\uE036': 'F6',
	'\uE037': 'F7',
	'\uE038': 'F8',
	'\uE039': 'F9',
	'\uE03A': 'F10',
	'\uE03B': 'F11',
	'\uE03C': 'F12',
	'\uE03D': 'Command',
	'\uE040': 'Zenkaku/hankaku'
};
