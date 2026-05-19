type QueryLanguage = 'kuery' | 'lucene';
export declare function getDefaultQuery(language?: QueryLanguage): {
    query: string;
    language: QueryLanguage;
};
export {};
