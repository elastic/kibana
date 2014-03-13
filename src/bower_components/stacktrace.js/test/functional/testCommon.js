function toList(array) {
	return "<ol><li>" + (array.join("</li><li>")) + "</li></ol>";
}

function printTrace(trace) {
	var output = document.getElementById("output");
	if (!output) {
		output = document.createElement("div");
		output.id = "output";
		document.body.appendChild(output);
	}

	var content = [];
	content.push(toList(trace));
	content.push("--------------Expected:-------------------");
	content.push(toList(window.expected || []));
	output.innerHTML = (content.join("<br/>"));
}