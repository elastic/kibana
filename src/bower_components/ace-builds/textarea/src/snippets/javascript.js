__ace_shadowed__.define('ace/snippets/javascript', ['require', 'exports', 'module' ], function(require, exports, module) {


exports.snippetText = "snippet add\n\
	${1:obj}.add('${2:selector expression}')${3}\n\
snippet addClass\n\
	${1:obj}.addClass('${2:class name}')${3}\n\
snippet after\n\
	${1:obj}.after('${2:Some text <b>and bold!</b>}')${3}\n\
snippet ajax\n\
	$.ajax({\n\
		url: '${1:mydomain.com/url}',\n\
		type: '${2:POST}',\n\
		dataType: '${3:xml/html/script/json}',\n\
		data: $.param( $('${4:Element or Expression}') ),\n\
		complete: function (jqXHR, textStatus) {\n\
			${5:// callback}\n\
		},\n\
		success: function (data, textStatus, jqXHR) {\n\
			${6:// success callback}\n\
		},\n\
		error: function (jqXHR, textStatus, errorThrown) {\n\
			${7:// error callback}\n\
		}\n\
	});\n\
snippet ajaxcomplete\n\
	${1:obj}.ajaxComplete(function (${1:e}, xhr, settings) {\n\
		${2:// callback}\n\
	});\n\
snippet ajaxerror\n\
	${1:obj}.ajaxError(function (${1:e}, xhr, settings, thrownError) {\n\
		${2:// error callback}\n\
	});\n\
	${3}\n\
snippet ajaxget\n\
	$.get('${1:mydomain.com/url}',\n\
		${2:{ param1: value1 },}\n\
		function (data, textStatus, jqXHR) {\n\
			${3:// success callback}\n\
		}\n\
	);\n\
snippet ajaxpost\n\
	$.post('${1:mydomain.com/url}',\n\
		${2:{ param1: value1 },}\n\
		function (data, textStatus, jqXHR) {\n\
			${3:// success callback}\n\
		}\n\
	);\n\
snippet ajaxprefilter\n\
	$.ajaxPrefilter(function (${1:options}, ${2:originalOptions}, jqXHR) {\n\
		${3: // Modify options, control originalOptions, store jqXHR, etc}\n\
	});\n\
snippet ajaxsend\n\
	${1:obj}.ajaxSend(function (${1:request, settings}) {\n\
		${2:// error callback}\n\
	});\n\
	${3}\n\
snippet ajaxsetup\n\
	$.ajaxSetup({\n\
		url: \"${1:mydomain.com/url}\",\n\
		type: \"${2:POST}\",\n\
		dataType: \"${3:xml/html/script/json}\",\n\
		data: $.param( $(\"${4:Element or Expression}\") ),\n\
		complete: function (jqXHR, textStatus) {\n\
			${5:// callback}\n\
		},\n\
		success: function (data, textStatus, jqXHR) {\n\
			${6:// success callback}\n\
		},\n\
		error: function (jqXHR, textStatus, errorThrown) {\n\
			${7:// error callback}\n\
		}\n\
	});\n\
snippet ajaxstart\n\
	$.ajaxStart(function () {\n\
		${1:// handler for when an AJAX call is started and no other AJAX calls are in progress};\n\
	});\n\
	${2}\n\
snippet ajaxstop\n\
	$.ajaxStop(function () {\n\
		${1:// handler for when all AJAX calls have been completed};\n\
	});\n\
	${2}\n\
snippet ajaxsuccess\n\
	$.ajaxSuccess(function (${1:e}, xhr, settings) {\n\
		${2:// handler for when any AJAX call is successfully completed};\n\
	});\n\
	${2}\n\
snippet andself\n\
	${1:obj}.andSelf()${2}\n\
snippet animate\n\
	${1:obj}.animate({${2:param1: value1, param2: value2}}, ${3:speed})${4}\n\
snippet append\n\
	${1:obj}.append('${2:Some text <b>and bold!</b>}')${3}\n\
snippet appendTo\n\
	${1:obj}.appendTo('${2:selector expression}')${3}\n\
snippet attr\n\
	${1:obj}.attr('${2:attribute}', '${3:value}')${4}\n\
snippet attrm\n\
	${1:obj}.attr({'${2:attr1}': '${3:value1}', '${4:attr2}': '${5:value2}'})${6}\n\
snippet before\n\
	${1:obj}.before('${2:Some text <b>and bold!</b>}')${3}\n\
snippet bind\n\
	${1:obj}.bind('${2:event name}', function (${3:e}) {\n\
		${4:// event handler}\n\
	});\n\
snippet blur\n\
	${1:obj}.blur(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet C\n\
	$.Callbacks()${1}\n\
snippet Cadd\n\
	${1:callbacks}.add(${2:callbacks})${3}\n\
snippet Cdis\n\
	${1:callbacks}.disable()${2}\n\
snippet Cempty\n\
	${1:callbacks}.empty()${2}\n\
snippet Cfire\n\
	${1:callbacks}.fire(${2:args})${3}\n\
snippet Cfired\n\
	${1:callbacks}.fired()${2}\n\
snippet Cfirew\n\
	${1:callbacks}.fireWith(${2:this}, ${3:args})${4}\n\
snippet Chas\n\
	${1:callbacks}.has(${2:callback})${3}\n\
snippet Clock\n\
	${1:callbacks}.lock()${2}\n\
snippet Clocked\n\
	${1:callbacks}.locked()${2}\n\
snippet Crem\n\
	${1:callbacks}.remove(${2:callbacks})${3}\n\
snippet change\n\
	${1:obj}.change(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet children\n\
	${1:obj}.children('${2:selector expression}')${3}\n\
snippet clearq\n\
	${1:obj}.clearQueue(${2:'queue name'})${3}\n\
snippet click\n\
	${1:obj}.click(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet clone\n\
	${1:obj}.clone()${2}\n\
snippet contains\n\
	$.contains(${1:container}, ${2:contents});\n\
snippet css\n\
	${1:obj}.css('${2:attribute}', '${3:value}')${4}\n\
snippet csshooks\n\
	$.cssHooks['${1:CSS prop}'] = {\n\
		get: function (elem, computed, extra) {\n\
			${2: // handle getting the CSS property}\n\
		},\n\
		set: function (elem, value) {\n\
			${3: // handle setting the CSS value}\n\
		}\n\
	};\n\
snippet cssm\n\
	${1:obj}.css({${2:attribute1}: '${3:value1}', ${4:attribute2}: '${5:value2}'})${6}\n\
snippet D\n\
	$.Deferred()${1}\n\
snippet Dalways\n\
	${1:deferred}.always(${2:callbacks})${3}\n\
snippet Ddone\n\
	${1:deferred}.done(${2:callbacks})${3}\n\
snippet Dfail\n\
	${1:deferred}.fail(${2:callbacks})${3}\n\
snippet Disrej\n\
	${1:deferred}.isRejected()${2}\n\
snippet Disres\n\
	${1:deferred}.isResolved()${2}\n\
snippet Dnotify\n\
	${1:deferred}.notify(${2:args})${3}\n\
snippet Dnotifyw\n\
	${1:deferred}.notifyWith(${2:this}, ${3:args})${4}\n\
snippet Dpipe\n\
	${1:deferred}.then(${2:doneFilter}, ${3:failFilter}, ${4:progressFilter})${5}\n\
snippet Dprog\n\
	${1:deferred}.progress(${2:callbacks})${3}\n\
snippet Dprom\n\
	${1:deferred}.promise(${2:target})${3}\n\
snippet Drej\n\
	${1:deferred}.reject(${2:args})${3}\n\
snippet Drejw\n\
	${1:deferred}.rejectWith(${2:this}, ${3:args})${4}\n\
snippet Dres\n\
	${1:deferred}.resolve(${2:args})${3}\n\
snippet Dresw\n\
	${1:deferred}.resolveWith(${2:this}, ${3:args})${4}\n\
snippet Dstate\n\
	${1:deferred}.state()${2}\n\
snippet Dthen\n\
	${1:deferred}.then(${2:doneCallbacks}, ${3:failCallbacks}, ${4:progressCallbacks})${5}\n\
snippet Dwhen\n\
	$.when(${1:deferreds})${2}\n\
snippet data\n\
	${1:obj}.data(${2:obj})${3}\n\
snippet dataa\n\
	$.data('${1:selector expression}', '${2:key}'${3:, 'value'})${4}\n\
snippet dblclick\n\
	${1:obj}.dblclick(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet delay\n\
	${1:obj}.delay('${2:slow/400/fast}'${3:, 'queue name'})${4}\n\
snippet dele\n\
	${1:obj}.delegate('${2:selector expression}', '${3:event name}', function (${4:e}) {\n\
		${5:// event handler}\n\
	});\n\
snippet deq\n\
	${1:obj}.dequeue(${2:'queue name'})${3}\n\
snippet deqq\n\
	$.dequeue('${1:selector expression}'${2:, 'queue name'})${3}\n\
snippet detach\n\
	${1:obj}.detach('${2:selector expression}')${3}\n\
snippet die\n\
	${1:obj}.die(${2:event}, ${3:handler})${4}\n\
snippet each\n\
	${1:obj}.each(function (index) {\n\
		${2:this.innerHTML = this + \" is the element, \" + index + \" is the position\";}\n\
	});\n\
snippet el\n\
	$('<${1}/>'${2:, {}})${3}\n\
snippet eltrim\n\
	$.trim('${1:string}')${2}\n\
snippet empty\n\
	${1:obj}.empty()${2}\n\
snippet end\n\
	${1:obj}.end()${2}\n\
snippet eq\n\
	${1:obj}.eq(${2:element index})${3}\n\
snippet error\n\
	${1:obj}.error(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet eventsmap\n\
	{\n\
		:f${1}\n\
	}\n\
snippet extend\n\
	$.extend(${1:true, }${2:target}, ${3:obj})${4}\n\
snippet fadein\n\
	${1:obj}.fadeIn('${2:slow/400/fast}')${3}\n\
snippet fadeinc\n\
	${1:obj}.fadeIn('slow/400/fast', function () {\n\
		${2:// callback};\n\
	});\n\
snippet fadeout\n\
	${1:obj}.fadeOut('${2:slow/400/fast}')${3}\n\
snippet fadeoutc\n\
	${1:obj}.fadeOut('slow/400/fast', function () {\n\
		${2:// callback};\n\
	});\n\
snippet fadeto\n\
	${1:obj}.fadeTo('${2:slow/400/fast}', ${3:0.5})${4}\n\
snippet fadetoc\n\
	${1:obj}.fadeTo('slow/400/fast', ${2:0.5}, function () {\n\
		${3:// callback};\n\
	});\n\
snippet filter\n\
	${1:obj}.filter('${2:selector expression}')${3}\n\
snippet filtert\n\
	${1:obj}.filter(function (${2:index}) {\n\
		${3:// test code}\n\
	})${4}\n\
snippet find\n\
	${1:obj}.find('${2:selector expression}')${3}\n\
snippet focus\n\
	${1:obj}.focus(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet focusin\n\
	${1:obj}.focusIn(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet focusout\n\
	${1:obj}.focusOut(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet get\n\
	${1:obj}.get(${2:element index})${3}\n\
snippet getjson\n\
	$.getJSON('${1:mydomain.com/url}',\n\
		${2:{ param1: value1 },}\n\
		function (data, textStatus, jqXHR) {\n\
			${3:// success callback}\n\
		}\n\
	);\n\
snippet getscript\n\
	$.getScript('${1:mydomain.com/url}', function (script, textStatus, jqXHR) {\n\
		${2:// callback}\n\
	});\n\
snippet grep\n\
	$.grep(${1:array}, function (item, index) {\n\
		${2:// test code}\n\
	}${3:, true});\n\
snippet hasc\n\
	${1:obj}.hasClass('${2:className}')${3}\n\
snippet hasd\n\
	$.hasData('${1:selector expression}');\n\
snippet height\n\
	${1:obj}.height(${2:integer})${3}\n\
snippet hide\n\
	${1:obj}.hide('${2:slow/400/fast}')${3}\n\
snippet hidec\n\
	${1:obj}.hide('${2:slow/400/fast}', function () {\n\
		${3:// callback}\n\
	});\n\
snippet hover\n\
	${1:obj}.hover(function (${2:e}) {\n\
		${3:// event handler}\n\
	}, function ($2) {\n\
		${4:// event handler}\n\
	});${5}\n\
snippet html\n\
	${1:obj}.html('${2:Some text <b>and bold!</b>}')${3}\n\
snippet inarr\n\
	$.inArray(${1:value}, ${2:array});\n\
snippet insa\n\
	${1:obj}.insertAfter('${2:selector expression}')${3}\n\
snippet insb\n\
	${1:obj}.insertBefore('${2:selector expression}')${3}\n\
snippet is\n\
	${1:obj}.is('${2:selector expression}')${3}\n\
snippet isarr\n\
	$.isArray(${1:obj})${2}\n\
snippet isempty\n\
	$.isEmptyObject(${1:obj})${2}\n\
snippet isfunc\n\
	$.isFunction(${1:obj})${2}\n\
snippet isnum\n\
	$.isNumeric(${1:value})${2}\n\
snippet isobj\n\
	$.isPlainObject(${1:obj})${2}\n\
snippet iswin\n\
	$.isWindow(${1:obj})${2}\n\
snippet isxml\n\
	$.isXMLDoc(${1:node})${2}\n\
snippet jj\n\
	$('${1:selector}')${2}\n\
snippet kdown\n\
	${1:obj}.keydown(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet kpress\n\
	${1:obj}.keypress(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet kup\n\
	${1:obj}.keyup(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet last\n\
	${1:obj}.last('${1:selector expression}')${3}\n\
snippet live\n\
	${1:obj}.live('${2:events}', function (${3:e}) {\n\
		${4:// event handler}\n\
	});\n\
snippet load\n\
	${1:obj}.load(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet loadf\n\
	${1:obj}.load('${2:mydomain.com/url}',\n\
		${2:{ param1: value1 },}\n\
		function (responseText, textStatus, xhr) {\n\
			${3:// success callback}\n\
		}\n\
	});\n\
snippet makearray\n\
	$.makeArray(${1:obj});\n\
snippet map\n\
	${1:obj}.map(function (${2:index}, ${3:element}) {\n\
		${4:// callback}\n\
	});\n\
snippet mapp\n\
	$.map(${1:arrayOrObject}, function (${2:value}, ${3:indexOrKey}) {\n\
		${4:// callback}\n\
	});\n\
snippet merge\n\
	$.merge(${1:target}, ${2:original});\n\
snippet mdown\n\
	${1:obj}.mousedown(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet menter\n\
	${1:obj}.mouseenter(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet mleave\n\
	${1:obj}.mouseleave(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet mmove\n\
	${1:obj}.mousemove(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet mout\n\
	${1:obj}.mouseout(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet mover\n\
	${1:obj}.mouseover(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet mup\n\
	${1:obj}.mouseup(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet next\n\
	${1:obj}.next('${2:selector expression}')${3}\n\
snippet nexta\n\
	${1:obj}.nextAll('${2:selector expression}')${3}\n\
snippet nextu\n\
	${1:obj}.nextUntil('${2:selector expression}'${3:, 'filter expression'})${4}\n\
snippet not\n\
	${1:obj}.not('${2:selector expression}')${3}\n\
snippet off\n\
	${1:obj}.off('${2:events}', '${3:selector expression}'${4:, handler})${5}\n\
snippet offset\n\
	${1:obj}.offset()${2}\n\
snippet offsetp\n\
	${1:obj}.offsetParent()${2}\n\
snippet on\n\
	${1:obj}.on('${2:events}', '${3:selector expression}', function (${4:e}) {\n\
		${5:// event handler}\n\
	});\n\
snippet one\n\
	${1:obj}.one('${2:event name}', function (${3:e}) {\n\
		${4:// event handler}\n\
	});\n\
snippet outerh\n\
	${1:obj}.outerHeight()${2}\n\
snippet outerw\n\
	${1:obj}.outerWidth()${2}\n\
snippet param\n\
	$.param(${1:obj})${2}\n\
snippet parent\n\
	${1:obj}.parent('${2:selector expression}')${3}\n\
snippet parents\n\
	${1:obj}.parents('${2:selector expression}')${3}\n\
snippet parentsu\n\
	${1:obj}.parentsUntil('${2:selector expression}'${3:, 'filter expression'})${4}\n\
snippet parsejson\n\
	$.parseJSON(${1:data})${2}\n\
snippet parsexml\n\
	$.parseXML(${1:data})${2}\n\
snippet pos\n\
	${1:obj}.position()${2}\n\
snippet prepend\n\
	${1:obj}.prepend('${2:Some text <b>and bold!</b>}')${3}\n\
snippet prependto\n\
	${1:obj}.prependTo('${2:selector expression}')${3}\n\
snippet prev\n\
	${1:obj}.prev('${2:selector expression}')${3}\n\
snippet preva\n\
	${1:obj}.prevAll('${2:selector expression}')${3}\n\
snippet prevu\n\
	${1:obj}.prevUntil('${2:selector expression}'${3:, 'filter expression'})${4}\n\
snippet promise\n\
	${1:obj}.promise(${2:'fx'}, ${3:target})${4}\n\
snippet prop\n\
	${1:obj}.prop('${2:property name}')${3}\n\
snippet proxy\n\
	$.proxy(${1:function}, ${2:this})${3}\n\
snippet pushstack\n\
	${1:obj}.pushStack(${2:elements})${3}\n\
snippet queue\n\
	${1:obj}.queue(${2:name}${3:, newQueue})${4}\n\
snippet queuee\n\
	$.queue(${1:element}${2:, name}${3:, newQueue})${4}\n\
snippet ready\n\
	$(function () {\n\
		${1}\n\
	});\n\
snippet rem\n\
	${1:obj}.remove()${2}\n\
snippet rema\n\
	${1:obj}.removeAttr('${2:attribute name}')${3}\n\
snippet remc\n\
	${1:obj}.removeClass('${2:class name}')${3}\n\
snippet remd\n\
	${1:obj}.removeData('${2:key name}')${3}\n\
snippet remdd\n\
	$.removeData(${1:element}${2:, 'key name}')${3}\n\
snippet remp\n\
	${1:obj}.removeProp('${2:property name}')${3}\n\
snippet repa\n\
	${1:obj}.replaceAll(${2:target})${3}\n\
snippet repw\n\
	${1:obj}.replaceWith(${2:content})${3}\n\
snippet reset\n\
	${1:obj}.reset(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet resize\n\
	${1:obj}.resize(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet scroll\n\
	${1:obj}.scroll(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet scrolll\n\
	${1:obj}.scrollLeft(${2:value})${3}\n\
snippet scrollt\n\
	${1:obj}.scrollTop(${2:value})${3}\n\
snippet sdown\n\
	${1:obj}.slideDown('${2:slow/400/fast}')${3}\n\
snippet sdownc\n\
	${1:obj}.slideDown('${2:slow/400/fast}', function () {\n\
		${3:// callback};\n\
	});\n\
snippet select\n\
	${1:obj}.select(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet serialize\n\
	${1:obj}.serialize()${2}\n\
snippet serializea\n\
	${1:obj}.serializeArray()${2}\n\
snippet show\n\
	${1:obj}.show('${2:slow/400/fast}')${3}\n\
snippet showc\n\
	${1:obj}.show('${2:slow/400/fast}', function () {\n\
		${3:// callback}\n\
	});\n\
snippet sib\n\
	${1:obj}.siblings('${2:selector expression}')${3}\n\
snippet size\n\
	${1:obj}.size()${2}\n\
snippet slice\n\
	${1:obj}.slice(${2:start}${3:, end})${4}\n\
snippet stoggle\n\
	${1:obj}.slideToggle('${2:slow/400/fast}')${3}\n\
snippet stop\n\
	${1:obj}.stop('${2:queue}', ${3:false}, ${4:false})${5}\n\
snippet submit\n\
	${1:obj}.submit(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet sup\n\
	${1:obj}.slideUp('${2:slow/400/fast}')${3}\n\
snippet supc\n\
	${1:obj}.slideUp('${2:slow/400/fast}', function () {\n\
		${3:// callback};\n\
	});\n\
snippet text\n\
	${1:obj}.text(${2:'some text'})${3}\n\
snippet this\n\
	$(this)${1}\n\
snippet toarr\n\
	${1:obj}.toArray()\n\
snippet tog\n\
	${1:obj}.toggle(function (${2:e}) {\n\
		${3:// event handler}\n\
	}, function ($2) {\n\
		${4:// event handler}\n\
	});\n\
	${4}\n\
snippet togclass\n\
	${1:obj}.toggleClass('${2:class name}')${3}\n\
snippet togsh\n\
	${1:obj}.toggle('${2:slow/400/fast}')${3}\n\
snippet trig\n\
	${1:obj}.trigger('${2:event name}')${3}\n\
snippet trigh\n\
	${1:obj}.triggerHandler('${2:event name}')${3}\n\
snippet $trim\n\
	$.trim(${1:str})${2}\n\
snippet $type\n\
	$.type(${1:obj})${2}\n\
snippet unbind\n\
	${1:obj}.unbind('${2:event name}')${3}\n\
snippet undele\n\
	${1:obj}.undelegate(${2:selector expression}, ${3:event}, ${4:handler})${5}\n\
snippet uniq\n\
	$.unique(${1:array})${2}\n\
snippet unload\n\
	${1:obj}.unload(function (${2:e}) {\n\
		${3:// event handler}\n\
	});\n\
snippet unwrap\n\
	${1:obj}.unwrap()${2}\n\
snippet val\n\
	${1:obj}.val('${2:text}')${3}\n\
snippet width\n\
	${1:obj}.width(${2:integer})${3}\n\
snippet wrap\n\
	${1:obj}.wrap('${2:&lt;div class=\"extra-wrapper\"&gt;&lt;/div&gt;}')${3}\n\
"
    + "\n"
    + "# Prototype\n\
snippet proto\n\
	${1:class_name}.prototype.${2:method_name} = function(${3:first_argument}) {\n\
		${4:// body...}\n\
	};\n\
# Function\n\
snippet fun\n\
	function ${1?:function_name}(${2:argument}) {\n\
		${3:// body...}\n\
	}\n\
# Anonymous Function\n\
regex /((=)\\s*|(:)\\s*|(\\()|\\b)/f/(\\))?/\n\
snippet f\n\
	function${M1?: ${1:functionName}}($2) {\n\
		${0:$TM_SELECTED_TEXT}\n\
	}${M2?;}${M3?,}${M4?)}\n\
# Immediate function\n\
trigger \\(?f\\(\n\
endTrigger \\)?\n\
snippet f(\n\
	(function(${1}) {\n\
		${0:${TM_SELECTED_TEXT:/* code */}}\n\
	}(${1}));\n\
# if\n\
snippet if\n\
	if (${1:true}) {\n\
		${0}\n\
	}\n\
# if ... else\n\
snippet ife\n\
	if (${1:true}) {\n\
		${2}\n\
	} else {\n\
		${0}\n\
	}\n\
# tertiary conditional\n\
snippet ter\n\
	${1:/* condition */} ? ${2:a} : ${3:b}\n\
# switch\n\
snippet switch\n\
	switch (${1:expression}) {\n\
		case '${3:case}':\n\
			${4:// code}\n\
			break;\n\
		${5}\n\
		default:\n\
			${2:// code}\n\
	}\n\
# case\n\
snippet case\n\
	case '${1:case}':\n\
		${2:// code}\n\
		break;\n\
	${3}\n\
\n\
# while (...) {...}\n\
snippet wh\n\
	while (${1:/* condition */}) {\n\
		${0:/* code */}\n\
	}\n\
# try\n\
snippet try\n\
	try {\n\
		${0:/* code */}\n\
	} catch (e) {}\n\
# do...while\n\
snippet do\n\
	do {\n\
		${2:/* code */}\n\
	} while (${1:/* condition */});\n\
# Object Method\n\
snippet :f\n\
regex /([,{[])|^\\s*/:f/\n\
	${1:method_name}: function(${2:attribute}) {\n\
		${0}\n\
	}${3:,}\n\
# setTimeout function\n\
snippet setTimeout\n\
regex /\\b/st|timeout|setTimeo?u?t?/\n\
	setTimeout(function() {${3:$TM_SELECTED_TEXT}}, ${1:10});\n\
# Get Elements\n\
snippet gett\n\
	getElementsBy${1:TagName}('${2}')${3}\n\
# Get Element\n\
snippet get\n\
	getElementBy${1:Id}('${2}')${3}\n\
# console.log (Firebug)\n\
snippet cl\n\
	console.log(${1});\n\
# return\n\
snippet ret\n\
	return ${1:result}\n\
# for (property in object ) { ... }\n\
snippet fori\n\
	for (var ${1:prop} in ${2:Things}) {\n\
		${0:$2[$1]}\n\
	}\n\
# hasOwnProperty\n\
snippet has\n\
	hasOwnProperty(${1})\n\
# docstring\n\
snippet /**\n\
	/**\n\
	 * ${1:description}\n\
	 *\n\
	 */\n\
snippet @par\n\
regex /^\\s*\\*\\s*/@(para?m?)?/\n\
	@param {${1:type}} ${2:name} ${3:description}\n\
snippet @ret\n\
	@return {${1:type}} ${2:description}\n\
# JSON.parse\n\
snippet jsonp\n\
	JSON.parse(${1:jstr});\n\
# JSON.stringify\n\
snippet jsons\n\
	JSON.stringify(${1:object});\n\
# self-defining function\n\
snippet sdf\n\
	var ${1:function_name} = function(${2:argument}) {\n\
		${3:// initial code ...}\n\
\n\
		$1 = function($2) {\n\
			${4:// main code}\n\
		};\n\
	}\n\
# singleton\n\
snippet sing\n\
	function ${1:Singleton} (${2:argument}) {\n\
		// the cached instance\n\
		var instance;\n\
\n\
		// rewrite the constructor\n\
		$1 = function $1($2) {\n\
			return instance;\n\
		};\n\
		\n\
		// carry over the prototype properties\n\
		$1.prototype = this;\n\
\n\
		// the instance\n\
		instance = new $1();\n\
\n\
		// reset the constructor pointer\n\
		instance.constructor = $1;\n\
\n\
		${3:// code ...}\n\
\n\
		return instance;\n\
	}\n\
# class\n\
snippet class\n\
regex /^\\s*/clas{0,2}/\n\
	var ${1:class} = function(${20}) {\n\
		$40$0\n\
	};\n\
	\n\
	(function() {\n\
		${60:this.prop = \"\"}\n\
	}).call(${1:class}.prototype);\n\
	\n\
	exports.${1:class} = ${1:class};\n\
# \n\
snippet for-\n\
	for (var ${1:i} = ${2:Things}.length; ${1:i}--; ) {\n\
		${0:${2:Things}[${1:i}];}\n\
	}\n\
# for (...) {...}\n\
snippet for\n\
	for (var ${1:i} = 0; $1 < ${2:Things}.length; $1++) {\n\
		${3:$2[$1]}$0\n\
	}\n\
# for (...) {...} (Improved Native For-Loop)\n\
snippet forr\n\
	for (var ${1:i} = ${2:Things}.length - 1; $1 >= 0; $1--) {\n\
		${3:$2[$1]}$0\n\
	}\n\
\n\
\n\
#modules\n\
snippet def\n\
	__ace_shadowed__.define(function(require, exports, module) {\n\
	\"use strict\";\n\
	var ${1/.*\\///} = require(\"${1}\");\n\
	\n\
	$TM_SELECTED_TEXT\n\
	});\n\
snippet req\n\
guard ^\\s*\n\
	var ${1/.*\\///} = require(\"${1}\");\n\
	$0\n\
snippet requ\n\
guard ^\\s*\n\
	var ${1/.*\\/(.)/\\u$1/} = require(\"${1}\").${1/.*\\/(.)/\\u$1/};\n\
	$0\n\
";
exports.scope = "javascript";

});
