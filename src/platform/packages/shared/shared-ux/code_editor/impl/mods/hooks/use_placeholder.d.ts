import type { monaco } from '@kbn/monaco';
import type { UseEuiTheme } from '@elastic/eui';
export declare const usePlaceholder: ({ placeholder, euiTheme, editor, value, }: {
    placeholder: string | undefined;
    euiTheme: UseEuiTheme["euiTheme"];
    editor: monaco.editor.IStandaloneCodeEditor | null;
    value: string;
}) => void;
