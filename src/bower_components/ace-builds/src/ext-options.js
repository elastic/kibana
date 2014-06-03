define('ace/ext/options', ['require', 'exports', 'module' ], function(require, exports, module) {


var modesByName = modelist.modesByName;

var options = [
    ["Document", function(name) {
        doclist.loadDoc(name, function(session) {
            if (!session)
                return;
            session = env.split.setSession(session);
            updateUIEditorOptions();
            env.editor.focus();
        });
    }, doclist.all],
	["Mode", function(value) {
        env.editor.session.setMode(modesByName[value].mode || modesByName.text.mode);
        env.editor.session.modeName = value;
	}, function(value) {
		return env.editor.session.modeName || "text"
	}, modelist.modes],
	["Split", function(value) {
		var sp = env.split;
		if (value == "none") {
			if (sp.getSplits() == 2) {
				env.secondSession = sp.getEditor(1).session;
        }
        sp.setSplits(1);
    } else {
        var newEditor = (sp.getSplits() == 1);
        if (value == "below") {
            sp.setOrientation(sp.BELOW);
        } else {
            sp.setOrientation(sp.BESIDE);
        }
        sp.setSplits(2);

        if (newEditor) {
				var session = env.secondSession || sp.getEditor(0).session;
            var newSession = sp.setSession(session, 1);
            newSession.name = session.name;
        }
    }
	}, ["None", "Beside", "Below"]],
	["Theme", function(value) {
		if (!value)
			return;
		env.editor.setTheme("ace/theme/" + value);
		themeEl.selectedValue = value;
	}, function() {
		return env.editor.getTheme();
	}, {
		"Bright": {
            chrome: "Chrome",
            clouds: "Clouds",
            crimson_editor: "Crimson Editor",
            dawn: "Dawn",
            dreamweaver: "Dreamweaver",
            eclipse: "Eclipse",
            github: "GitHub",
            solarized_light: "Solarized Light",
            textmate: "TextMate",
            tomorrow: "Tomorrow",
            xcode: "XCode"
        },
        "Dark": {
            ambiance: "Ambiance",
            chaos: "Chaos",
            clouds_midnight: "Clouds Midnight",
            cobalt: "Cobalt",
            idle_fingers: "idleFingers",
            kr_theme: "krTheme",
            merbivore: "Merbivore",
            merbivore_soft: "Merbivore Soft",
            mono_industrial: "Mono Industrial",
            monokai: "Monokai",
            pastel_on_dark: "Pastel on dark",
            solarized_dark: "Solarized Dark",
            twilight: "Twilight",
            tomorrow_night: "Tomorrow Night",
            tomorrow_night_blue: "Tomorrow Night Blue",
            tomorrow_night_bright: "Tomorrow Night Bright",
            tomorrow_night_eighties: "Tomorrow Night 80s",
            vibrant_ink: "Vibrant Ink",
        }
	}],
	["Code Folding", function(value) {
		env.editor.getSession().setFoldStyle(value);
		env.editor.setShowFoldWidgets(value !== "manual");
	}, ["manual", "mark begin", "mark begin and end"]],
	["Soft Wrap", function(value) {
		value = value.toLowerCase()
		var session = env.editor.getSession();
		var renderer = env.editor.renderer;
		session.setUseWrapMode(value == "off");
		var col = parseInt(value) || null;
		renderer.setPrintMarginColumn(col || 80);
		session.setWrapLimitRange(col, col);
	}, ["Off", "40 Chars", "80 Chars", "Free"]],
	["Key Binding", function(value) {
		env.editor.setKeyboardHandler(keybindings[value]);
	}, ["Ace", "Vim", "Emacs", "Custom"]],
	["Font Size", function(value) {
		env.split.setFontSize(value + "px");
	}, [10, 11, 12, 14, 16, 20, 24]],
    ["Full Line Selection", function(checked) {
		env.editor.setSelectionStyle(checked ? "line" : "text");
	}],
	["Highlight Active Line", function(checked) {
		env.editor.setHighlightActiveLine(checked);
	}],
	["Show Invisibles", function(checked) {
		env.editor.setShowInvisibles(checked);
	}],
	["Show Gutter", function(checked) {
		env.editor.renderer.setShowGutter(checked);
	}],
    ["Show Indent Guides", function(checked) {
		env.editor.renderer.setDisplayIndentGuides(checked);
	}],
	["Show Print Margin", function(checked) {
		env.editor.renderer.setShowPrintMargin(checked);
	}],
	["Persistent HScroll", function(checked) {
		env.editor.renderer.setHScrollBarAlwaysVisible(checked);
	}],
	["Animate Scrolling", function(checked) {
		env.editor.setAnimatedScroll(checked);
	}],
	["Use Soft Tab", function(checked) {
		env.editor.getSession().setUseSoftTabs(checked);
	}],
	["Highlight Selected Word", function(checked) {
		env.editor.setHighlightSelectedWord(checked);
	}],
	["Enable Behaviours", function(checked) {
		env.editor.setBehavioursEnabled(checked);
	}],
	["Fade Fold Widgets", function(checked) {
		env.editor.setFadeFoldWidgets(checked);
	}],
	["Show Token info", function(checked) {
		env.editor.setFadeFoldWidgets(checked);
	}]
]

var createOptionsPanel = function(options) {
	var html = []
	var container = document.createElement("div");
	container.style.cssText = "position: absolute; overflow: hidden";
	var inner = document.createElement("div");
	inner.style.cssText = "width: 120%;height:100%;overflow: scroll";
	container.appendChild(inner);
	html.push("<table><tbody>");
	
	options.forEach(function(o) {
		
    });

	html.push(
		'<tr>',
		  '<td>',
			'<label for="', s,'"></label>',
		  '</td><td>',
			'<input type="', s,'" name="', s,'" id="',s ,'">',
		  '</td>',
		'</tr>'
	)
	html.push("</tbody></table>");	
	return container;
}

function bindCheckbox(id, callback) {
    var el = document.getElementById(id);
    if (localStorage && localStorage.getItem(id))
        el.checked = localStorage.getItem(id) == "1";

    var onCheck = function() {
        callback(!!el.checked);
        saveOption(el);
    };
    el.onclick = onCheck;
    onCheck();
}

function bindDropdown(id, callback) {
    var el = document.getElementById(id);
    if (localStorage && localStorage.getItem(id))
        el.value = localStorage.getItem(id);

    var onChange = function() {
        callback(el.value);
        saveOption(el);
    };

    el.onchange = onChange;
    onChange();
}

function fillOptgroup(list, el) {
    list.forEach(function(item) {
        var option = document.createElement("option");
        option.setAttribute("value", item.name);
        option.innerHTML = item.desc;
        el.appendChild(option);
    });
}

function fillDropdown(list, el) {
	if (Array.isArray(list)) {
		fillOptgroup(list, el);
		return;
	}
	for(var i in list) {
		var group = document.createElement("optgroup");
		group.setAttribute("label", i);
		fillOptgroup(list[i], group);
		el.appendChild(group);
	}
}

function createOptionControl(opt) {
    if (opt.values) {
        var el = dom.createElement("select");
        el.setAttribute("size", opt.visibleSize || 1);
        fillDropdown(opt.values, el)        
    } else {
        var el = dom.createElement("checkbox");
    }
    el.setAttribute("name", "opt_" + opt.name)
    return el;
}

function createOptionCell(opt) {
    if (opt.values) {
        var el = dom.createElement("select");
        el.setAttribute("size", opt.visibleSize || 1);
        fillDropdown(opt.values, el)        
    } else {
        var el = dom.createElement("checkbox");
    }
    el.setAttribute("name", "opt_" + opt.name)
    return el;
}


createOptionsPanel(options)



});

