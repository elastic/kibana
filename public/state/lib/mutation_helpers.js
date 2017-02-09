export const mutateWithId = (id, value) => ({id, value});

export const mutateWithIdAndName = (id, name, value) => ({id, name, value});

export const mutateElement = mutateWithId;

export const mutateArgument = mutateWithIdAndName;
