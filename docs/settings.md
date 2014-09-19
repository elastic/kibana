## Settings

The settings application is broken up into three pages: Indices, Advanced, and Object.

### Indices

The Indices page manages Index Patterns. Before you can do anything in Kibana you will need to create an Index Pattern to use in other parts of the application. Index Patterns represent one or more indices in Elasticsearch and track associated meta-data, like field types and pattern interval.

#### Creating an Index Pattern

If this is your first time in Kibana you'll be prompted to create your first index pattern. For more information on index pattern creation see the **Getting Started** section of the documentation.

### Advanced

Please, **use caution** on this page, because the advanced editor will let you break things.

The Advanced page allows modification of individual configuration parameters. Each of these parameters can be tweaked to customize the entire Kibana installation. This means that your changes will apply to all users. This could prevent the application from loading if used incorrectly.

#### Edit

Clicking on the edit button for any line will cause the *Value* column on that line to become an input, allowing you change the value.

Click the *Save* button to save your changes.

#### Reset

Clicking on the *Reset* button will undo any changes you made and restore the value back to its default.

### Objects

Please, **use caution** on this page. No support is available for changes made here.

The Objects page manages all of the objects created by Kibana (except Index Patterns which are handled by the Indices page).  Most apps give you all the tools needed to manage objects they create, but if/when they fall short, you can come here to tweak the specifics.

#### View

Clicking on the *View* action loads that item in the associated applications. Refer to the documentation for the associated applications if you need help using them.

#### Edit

Clicking *Edit* will allow you to change the title, description and other settings of the saved object. You can also edit the schema of the stored object.

*Note:* this operation is for advanced users only - making changes here can break large portions of the application.