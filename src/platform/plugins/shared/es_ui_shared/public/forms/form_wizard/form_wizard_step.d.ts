interface Props {
    id: string;
    label: string;
    children: JSX.Element;
    isRequired?: boolean;
}
export declare const FormWizardStep: ({ id, label, isRequired, children }: Props) => JSX.Element | null;
export {};
