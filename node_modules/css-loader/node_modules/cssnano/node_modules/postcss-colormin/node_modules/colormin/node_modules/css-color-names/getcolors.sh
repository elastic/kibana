#!/usr/bin/env bash
curl -sS 'http://xahlee.info/js/css_color_names.html' \
	| grep 'style="background-color' \
	| sed -e :a -e 's/<[^>]*>/ /g;/</N;//ba' \
	| awk '{print $1, $2}'
