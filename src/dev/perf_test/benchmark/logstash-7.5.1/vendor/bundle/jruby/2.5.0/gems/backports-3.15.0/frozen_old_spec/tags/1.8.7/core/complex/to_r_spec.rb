fails:Complex#to_r when the imaginary part is Fixnum 0 returns the result of sending #to_r to the real part
fails:Complex#to_r when the imaginary part is Rational 0 returns the result of sending #to_r to the real part
fails:Complex#to_r when the imaginary part responds to #== 0 with true returns the result of sending #to_r to the real part
