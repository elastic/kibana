export declare const dataViewSpecSchema: import("@kbn/config-schema").ObjectType<{
    title: import("@kbn/config-schema").Type<string>;
    version: import("@kbn/config-schema").Type<string | undefined>;
    id: import("@kbn/config-schema").Type<string | undefined>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
    sourceFilters: import("@kbn/config-schema").Type<Readonly<{
        clientId?: string | number | undefined;
    } & {
        value: string;
    }>[] | undefined>;
    fields: import("@kbn/config-schema").Type<Record<string, Readonly<{
        script?: string | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        scripted?: boolean | undefined;
        esTypes?: string[] | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        runtimeField?: Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
    } & {
        type: string;
        name: string;
    }>> | undefined>;
    typeMeta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
    fieldFormats: import("@kbn/config-schema").Type<Record<string, Readonly<{
        id?: string | undefined;
        params?: any;
    } & {}>> | undefined>;
    fieldAttrs: import("@kbn/config-schema").Type<Record<string, Readonly<{
        customLabel?: string | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
    } & {}>> | undefined>;
    allowNoIndex: import("@kbn/config-schema").Type<boolean | undefined>;
    runtimeFieldMap: import("@kbn/config-schema").Type<Record<string, Readonly<{
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        customDescription?: string | undefined;
        popularity?: number | undefined;
    } & {
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
    }> | Readonly<{
        script?: Readonly<{} & {
            source: string;
        }> | undefined;
        fields?: Record<string, Readonly<{
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined;
    } & {
        type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
    }>> | undefined>;
    name: import("@kbn/config-schema").Type<string | undefined>;
    namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
    allowHidden: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const dataViewsRuntimeResponseSchema: () => import("@kbn/config-schema").ObjectType<{
    data_view: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<string | undefined>;
        timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
        sourceFilters: import("@kbn/config-schema").Type<Readonly<{
            clientId?: string | number | undefined;
        } & {
            value: string;
        }>[] | undefined>;
        fields: import("@kbn/config-schema").Type<Record<string, Readonly<{
            script?: string | undefined;
            subType?: Readonly<{
                nested?: Readonly<{} & {
                    path: string;
                }> | undefined;
                multi?: Readonly<{} & {
                    parent: string;
                }> | undefined;
            } & {}> | undefined;
            scripted?: boolean | undefined;
            esTypes?: string[] | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            runtimeField?: Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
            searchable?: boolean | undefined;
            aggregatable?: boolean | undefined;
            readFromDocValues?: boolean | undefined;
            shortDotsEnable?: boolean | undefined;
        } & {
            type: string;
            name: string;
        }>> | undefined>;
        typeMeta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        fieldFormats: import("@kbn/config-schema").Type<Record<string, Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}>> | undefined>;
        fieldAttrs: import("@kbn/config-schema").Type<Record<string, Readonly<{
            customLabel?: string | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
        } & {}>> | undefined>;
        allowNoIndex: import("@kbn/config-schema").Type<boolean | undefined>;
        runtimeFieldMap: import("@kbn/config-schema").Type<Record<string, Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined>;
        name: import("@kbn/config-schema").Type<string | undefined>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        allowHidden: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    fields: import("@kbn/config-schema").Type<Readonly<{
        script?: string | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        scripted?: boolean | undefined;
        esTypes?: string[] | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        runtimeField?: Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
    } & {
        type: string;
        name: string;
    }>[]>;
}>;
export declare const indexPatternsRuntimeResponseSchema: () => import("@kbn/config-schema").ObjectType<{
    index_pattern: import("@kbn/config-schema").ObjectType<{
        title: import("@kbn/config-schema").Type<string>;
        version: import("@kbn/config-schema").Type<string | undefined>;
        id: import("@kbn/config-schema").Type<string | undefined>;
        type: import("@kbn/config-schema").Type<string | undefined>;
        timeFieldName: import("@kbn/config-schema").Type<string | undefined>;
        sourceFilters: import("@kbn/config-schema").Type<Readonly<{
            clientId?: string | number | undefined;
        } & {
            value: string;
        }>[] | undefined>;
        fields: import("@kbn/config-schema").Type<Record<string, Readonly<{
            script?: string | undefined;
            subType?: Readonly<{
                nested?: Readonly<{} & {
                    path: string;
                }> | undefined;
                multi?: Readonly<{} & {
                    parent: string;
                }> | undefined;
            } & {}> | undefined;
            scripted?: boolean | undefined;
            esTypes?: string[] | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            runtimeField?: Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
            searchable?: boolean | undefined;
            aggregatable?: boolean | undefined;
            readFromDocValues?: boolean | undefined;
            shortDotsEnable?: boolean | undefined;
        } & {
            type: string;
            name: string;
        }>> | undefined>;
        typeMeta: import("@kbn/config-schema").Type<Readonly<{} & {}> | undefined>;
        fieldFormats: import("@kbn/config-schema").Type<Record<string, Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}>> | undefined>;
        fieldAttrs: import("@kbn/config-schema").Type<Record<string, Readonly<{
            customLabel?: string | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
        } & {}>> | undefined>;
        allowNoIndex: import("@kbn/config-schema").Type<boolean | undefined>;
        runtimeFieldMap: import("@kbn/config-schema").Type<Record<string, Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined>;
        name: import("@kbn/config-schema").Type<string | undefined>;
        namespaces: import("@kbn/config-schema").Type<string[] | undefined>;
        allowHidden: import("@kbn/config-schema").Type<boolean | undefined>;
    }>;
    field: import("@kbn/config-schema").ObjectType<{
        name: import("@kbn/config-schema").Type<string>;
        type: import("@kbn/config-schema").Type<string>;
        count: import("@kbn/config-schema").Type<number | undefined>;
        script: import("@kbn/config-schema").Type<string | undefined>;
        format: import("@kbn/config-schema").Type<Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined>;
        esTypes: import("@kbn/config-schema").Type<string[] | undefined>;
        scripted: import("@kbn/config-schema").Type<boolean | undefined>;
        subType: import("@kbn/config-schema").Type<Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined>;
        customLabel: import("@kbn/config-schema").Type<string | undefined>;
        customDescription: import("@kbn/config-schema").Type<string | undefined>;
        shortDotsEnable: import("@kbn/config-schema").Type<boolean | undefined>;
        searchable: import("@kbn/config-schema").Type<boolean | undefined>;
        aggregatable: import("@kbn/config-schema").Type<boolean | undefined>;
        readFromDocValues: import("@kbn/config-schema").Type<boolean | undefined>;
        runtimeField: import("@kbn/config-schema").Type<Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined>;
    }>;
}>;
export declare const runtimeResponseSchema: () => import("@kbn/config-schema").Type<Readonly<{} & {
    fields: Readonly<{
        script?: string | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        scripted?: boolean | undefined;
        esTypes?: string[] | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        runtimeField?: Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
    } & {
        type: string;
        name: string;
    }>[];
    data_view: Readonly<{
        type?: string | undefined;
        id?: string | undefined;
        name?: string | undefined;
        version?: string | undefined;
        fields?: Record<string, Readonly<{
            script?: string | undefined;
            subType?: Readonly<{
                nested?: Readonly<{} & {
                    path: string;
                }> | undefined;
                multi?: Readonly<{} & {
                    parent: string;
                }> | undefined;
            } & {}> | undefined;
            scripted?: boolean | undefined;
            esTypes?: string[] | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            runtimeField?: Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
            searchable?: boolean | undefined;
            aggregatable?: boolean | undefined;
            readFromDocValues?: boolean | undefined;
            shortDotsEnable?: boolean | undefined;
        } & {
            type: string;
            name: string;
        }>> | undefined;
        fieldFormats?: Record<string, Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}>> | undefined;
        timeFieldName?: string | undefined;
        sourceFilters?: Readonly<{
            clientId?: string | number | undefined;
        } & {
            value: string;
        }>[] | undefined;
        typeMeta?: Readonly<{} & {}> | undefined;
        runtimeFieldMap?: Record<string, Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined;
        fieldAttrs?: Record<string, Readonly<{
            customLabel?: string | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
        } & {}>> | undefined;
        allowNoIndex?: boolean | undefined;
        namespaces?: string[] | undefined;
        allowHidden?: boolean | undefined;
    } & {
        title: string;
    }>;
}> | Readonly<{} & {
    field: Readonly<{
        script?: string | undefined;
        subType?: Readonly<{
            nested?: Readonly<{} & {
                path: string;
            }> | undefined;
            multi?: Readonly<{} & {
                parent: string;
            }> | undefined;
        } & {}> | undefined;
        scripted?: boolean | undefined;
        esTypes?: string[] | undefined;
        format?: Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}> | undefined;
        customLabel?: string | undefined;
        runtimeField?: Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | undefined;
        count?: number | undefined;
        customDescription?: string | undefined;
        searchable?: boolean | undefined;
        aggregatable?: boolean | undefined;
        readFromDocValues?: boolean | undefined;
        shortDotsEnable?: boolean | undefined;
    } & {
        type: string;
        name: string;
    }>;
    index_pattern: Readonly<{
        type?: string | undefined;
        id?: string | undefined;
        name?: string | undefined;
        version?: string | undefined;
        fields?: Record<string, Readonly<{
            script?: string | undefined;
            subType?: Readonly<{
                nested?: Readonly<{} & {
                    path: string;
                }> | undefined;
                multi?: Readonly<{} & {
                    parent: string;
                }> | undefined;
            } & {}> | undefined;
            scripted?: boolean | undefined;
            esTypes?: string[] | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            runtimeField?: Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | Readonly<{
                script?: Readonly<{} & {
                    source: string;
                }> | undefined;
                fields?: Record<string, Readonly<{
                    format?: Readonly<{
                        id?: string | undefined;
                        params?: any;
                    } & {}> | undefined;
                    customLabel?: string | undefined;
                    customDescription?: string | undefined;
                    popularity?: number | undefined;
                } & {
                    type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
                }>> | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }> | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
            searchable?: boolean | undefined;
            aggregatable?: boolean | undefined;
            readFromDocValues?: boolean | undefined;
            shortDotsEnable?: boolean | undefined;
        } & {
            type: string;
            name: string;
        }>> | undefined;
        fieldFormats?: Record<string, Readonly<{
            id?: string | undefined;
            params?: any;
        } & {}>> | undefined;
        timeFieldName?: string | undefined;
        sourceFilters?: Readonly<{
            clientId?: string | number | undefined;
        } & {
            value: string;
        }>[] | undefined;
        typeMeta?: Readonly<{} & {}> | undefined;
        runtimeFieldMap?: Record<string, Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            format?: Readonly<{
                id?: string | undefined;
                params?: any;
            } & {}> | undefined;
            customLabel?: string | undefined;
            customDescription?: string | undefined;
            popularity?: number | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }> | Readonly<{
            script?: Readonly<{} & {
                source: string;
            }> | undefined;
            fields?: Record<string, Readonly<{
                format?: Readonly<{
                    id?: string | undefined;
                    params?: any;
                } & {}> | undefined;
                customLabel?: string | undefined;
                customDescription?: string | undefined;
                popularity?: number | undefined;
            } & {
                type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
            }>> | undefined;
        } & {
            type: "boolean" | "ip" | "keyword" | "date" | "long" | "double" | "composite" | "geo_point";
        }>> | undefined;
        fieldAttrs?: Record<string, Readonly<{
            customLabel?: string | undefined;
            count?: number | undefined;
            customDescription?: string | undefined;
        } & {}>> | undefined;
        allowNoIndex?: boolean | undefined;
        namespaces?: string[] | undefined;
        allowHidden?: boolean | undefined;
    } & {
        title: string;
    }>;
}>>;
