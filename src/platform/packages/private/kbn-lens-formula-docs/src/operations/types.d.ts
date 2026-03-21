export interface OperationDocumentationType {
    id: string;
    name: string;
    documentation: {
        signature: string;
        description: string;
        section: 'elasticsearch' | 'calculation' | 'constants';
    };
}
