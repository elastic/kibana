import { useEffect, useState } from 'react';
import Auth, { IUser } from '../services/Auth';

export const useCurrentUser = () => {
  const [currentUser, setCurrentUser] = useState<IUser | undefined>(undefined);

  useEffect(() => {
    Auth.getCurrentUser();
    return Auth.subscribe(setCurrentUser);
  }, []);

  return currentUser;
};
