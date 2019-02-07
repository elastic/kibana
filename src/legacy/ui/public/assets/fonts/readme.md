## Font usage

Kibana packages two fonts:

* [Inter UI](https://rsms.me/inter/) fonts were pulled from their site and are at v3.2
* [Roboto Mono](https://fonts.google.com/specimen/Roboto+Mono) was pulled from the Google Fonts website on January 22, 2019.

Licenses for both can be found in the folders below this root.


## How fonts are loaded

Reference the `src/ui/ui_render/views/chrome.pug` which makes the font-face CSS declarations against the files contained here. References to those those faces are called directly in [EUI](https://github.com/elastic/eui) primarily through the [typography variables](https://github.com/elastic/eui/blob/master/src/global_styling/variables/_typography.scss).