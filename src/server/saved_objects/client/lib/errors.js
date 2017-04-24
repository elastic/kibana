import Boom from 'boom';

export function createTitleConflictError(type, title) {
  const error = Boom.conflict(
    `title "${title}" is in use by another ${type} ` +
    '(use allow_title_conflict=true to ignore)'
  );
  error.output.payload.title_conflict = true;
  error.savedObjectsClientInfo = {
    titleConflict: true
  };
  throw error;
}

export function createIdConflictError() {
  const error = Boom.conflict('id conflict (pass allow_overwrite=true or use PUT to update)');
  error.output.payload.id_conflict = true;
  error.savedObjectsClientInfo = {
    idConflict: true
  };
  throw error;
}
