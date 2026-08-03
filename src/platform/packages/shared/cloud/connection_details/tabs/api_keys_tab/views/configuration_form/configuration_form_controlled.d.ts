import * as React from 'react';
export interface ConfigurationFormControlledProps {
    name: string;
    loading?: boolean;
    error?: Error | unknown;
    onNameChange: React.ChangeEventHandler<HTMLInputElement>;
    onSubmit: React.FormEventHandler<HTMLFormElement>;
}
export declare const ConfigurationFormControlled: React.FC<ConfigurationFormControlledProps>;
