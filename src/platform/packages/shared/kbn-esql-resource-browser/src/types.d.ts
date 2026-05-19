/**
 * Single-toggle selection change emitted by the data source browser.
 *
 * The UI behaves like a list of options: each click adds/removes one item and
 * immediately applies the corresponding change in the editor.
 */
export declare enum DataSourceSelectionChange {
    Add = "add",
    Remove = "remove"
}
