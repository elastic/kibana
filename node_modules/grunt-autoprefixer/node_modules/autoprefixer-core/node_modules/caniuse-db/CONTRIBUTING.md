# Contributing to the caniuse data

## Filing issues

Issues can be filed on existing **caniuse support data** or on **site functionality**. If you'd like to propose a new web technology feature to be added, please submit/vote for the issue on [Google Moderator](http://www.google.com/moderator/#15/e=ae425&t=ae425.40) rather than submitting an issue. This way features can be added based on the popularity of the feature.

## Caniuse data

The `features-json` directory includes JSON files for every feature found on [the caniuse.com website](http://caniuse.com/).
Maintaining these files on GitHub allows anyone to update or contribute to the support data on the site.

**Note:** when submitting a patch, don’t modify the minified `data.json` file in the root — that is done automatically. Only modify the contents of the `features-json` directory.

### How it works

The data on the site is stored in a database.
This data is periodically exported to the JSON files on GitHub.
Once a change or new file here has been approved, it is integrated back into the database
and the subsequent export files should be the same as the imported ones.
Not too confusing, I hope. :)

### Supported changes

Currently the following feature information can be modified:
* **title** — Feature name (used for the title of the table)
* **description** — Brief description of feature
* **spec** — Spec URL
* **status** — Spec status, one of the following:
	* `ls` - WHATWG Living Standard
	* `rec` - W3C Recommendation
	* `pr` - W3C Proposed Recommendation
	* `cr` - W3C Candidate Recommendation
	* `wd` - W3C Working Draft
	* `other` - Non-W3C, but reputable
	* `unoff` - Unofficial or W3C "Note"
* **links** — Array of "link" objects consisting of URL and short description of link
* **bugs** — Array of "bug" objects consisting of a bug description
* **categories** — Array of categories, any of the following:
	* `HTML5`
	* `CSS`
	* `CSS2`
	* `CSS3`
	* `SVG`
	* `PNG`
	* `JS API`
	* `Canvas`
	* `DOM`
	* `Other`
* **stats** — The collection of support data for a given set of browsers/versions. Only the support value strings can be modified. Values are space-separated characters with these meanings, and must answer the question "*Can I use* the feature by default?":
	* `y` - (**Y**)es, supported by default
	* `a` - (**A**)lmost supported (aka Partial support)
	* `n` - (**N**)o support, or disabled by default
	* `p` - No support, but has (**P**)olyfill
	* `u` - Support (**u**)nknown
	* `x` - Requires prefi(**x**) to work
	* `d` - (**D**)isabled by default (need to enable flag or something)
	* `#n` - Where n is a number, starting with 1, corresponds to the **notes_by_num** note.  For example: `"42":"y #1"` means version 42 is supported by default and see note 1.
* **notes** — Notes on feature support, often to explain what partial support refers to
* **notes_by_num** - Map of numbers corresponding to notes. Used in conjection with the #n notation under **stats**. Each key should be a number (no hash), the value is the related note. For example: `"1": "Foo"`
* **ucprefix** — Prefix should start with an uppercase letter
* **parent** — ID of parent feature
* **keywords** — Comma separated words that will match the feature in a search
* **ie_id** — Comma separated IDs used by [status.modern.ie](http://status.modern.ie) - Each ID is the string in the feature's URL 
* **chrome_id** — Comma separated IDs used by [chromestatus.com](http://chromestatus.com) - Each ID is the number in the feature's URL 
* **shown** — Whether or not feature is ready to be shown on the site. This can be left as false if the support data or information for other fields is still being collected

### Adding a feature

To add a feature, simply add another JSON file, following the [example](/sample-data.json), to the `features-json` directory with the base file name as the feature ID (only alphanumeric characters and hyphens please). If you want to submit a feature but don't have all information available for it yet, make sure you set the "shown" flag to false.

### Unsupported changes

Currently it is not possible to:
* Add a new browser or browser version (this will be made possible later)
* Add a test for any given feature (should also come later)
* Add any object properties not already defined above
* Modify the **usage\_perc\_y** or **usage\_perc\_a** values (these values are generated)

### Testing
Make sure you have NodeJS installed on your system.

Run

`node validator/validate-jsons.js`

If something is wrong, it will throw an error.
Everything is ok otherwise.
